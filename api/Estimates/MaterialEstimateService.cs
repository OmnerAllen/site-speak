using System.Linq;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using SiteSpeak.Logic;

namespace SiteSpeak.Estimates;

public sealed class MaterialEstimateService(
    IHttpClientFactory httpClientFactory,
    IOptions<MaterialEstimateOptions> options,
    MaterialRepository materials,
    EquipmentRepository equipment,
    ProjectRepository projects)
{
    private readonly MaterialEstimateOptions _options = options.Value;
    private static readonly string[] StageOrder = ["demo", "prep", "build/install", "qa"];

    private HttpClient LlmHttp => httpClientFactory.CreateClient("MaterialEstimateLlm");

    public async Task<MaterialEstimateApiResponse?> RunEstimateAsync(
        Guid projectId,
        Guid companyId,
        MaterialEstimateRequestBody? request,
        CancellationToken cancellationToken = default)
    {
        var details = await projects.GetDetailsAsync(projectId, companyId, cancellationToken);
        if (details is null) return null;

        var radiusMiles = request?.RadiusMiles ?? 50;
        if (radiusMiles <= 0 || radiusMiles > 500)
            throw new ArgumentOutOfRangeException(nameof(request), "Radius must be between 0 and 500 miles.");

        var warnings = new List<string>();

        var catalog = await materials.ListCatalogForEstimateAsync(cancellationToken);
        var allEquipment = await equipment.ListAsync(cancellationToken);

        if (catalog.Count == 0 && allEquipment.Count == 0)
        {
            warnings.Add("No materials or equipment in the catalog.");
            return EmptyResponse(warnings);
        }

        var materialById = catalog.ToDictionary(m => m.Id);
        var equipmentById = allEquipment.ToDictionary(e => e.Id);

        var systemPrompt = BuildSystemPrompt(radiusMiles);
        var userPrompt = BuildUserPrompt(details, catalog, allEquipment, request, radiusMiles);

        var (json, llmError) = await CallLlmJsonAsync(systemPrompt, userPrompt, cancellationToken);
        if (json is null)
        {
            warnings.Add(llmError ?? "Language model did not return usable JSON.");
            return EmptyResponse(warnings);
        }

        var extracted = MaterialEstimateProposalJson.ExtractJsonObject(json) ?? json;
        var proposal = MaterialEstimateProposalJson.TryParse(extracted);
        if (proposal?.Stages is null)
        {
            warnings.Add("Failed to parse estimate JSON from the language model.");
            return EmptyResponse(warnings);
        }

        var allowedMaterialIds = materialById.Keys.ToHashSet();
        var allowedEquipmentIds = equipmentById.Keys.ToHashSet();

        var merged = MergeStages(proposal.Stages);
        var responseStages = new List<MaterialEstimateStageApiDto>();

        foreach (var name in StageOrder)
        {
            var stageJson = merged.GetValueOrDefault(name);
            var matLines = new List<MaterialEstimateMaterialLineApiDto>();
            var eqLines = new List<MaterialEstimateEquipmentLineApiDto>();

            if (stageJson?.Materials is not null)
            {
                foreach (var line in stageJson.Materials)
                {
                    if (!allowedMaterialIds.Contains(line.MaterialId)) continue;
                    if (line.Quantity <= 0) continue;
                    if (!materialById.TryGetValue(line.MaterialId, out var row)) continue;
                    matLines.Add(new MaterialEstimateMaterialLineApiDto(
                        line.MaterialId,
                        row.ProductName,
                        line.Quantity,
                        line.Note));
                }
            }

            if (stageJson?.Equipment is not null)
            {
                foreach (var line in stageJson.Equipment)
                {
                    if (!allowedEquipmentIds.Contains(line.EquipmentId)) continue;
                    if (!equipmentById.TryGetValue(line.EquipmentId, out var row)) continue;
                    eqLines.Add(new MaterialEstimateEquipmentLineApiDto(
                        line.EquipmentId,
                        row.Name,
                        line.HalfDay,
                        line.Note));
                }
            }

            responseStages.Add(new MaterialEstimateStageApiDto(name, matLines, eqLines));
        }

        return new MaterialEstimateApiResponse(responseStages, warnings);
    }

    private static MaterialEstimateApiResponse EmptyResponse(IReadOnlyList<string> warnings) =>
        new(
            StageOrder.Select(n => new MaterialEstimateStageApiDto(n, Array.Empty<MaterialEstimateMaterialLineApiDto>(),
                Array.Empty<MaterialEstimateEquipmentLineApiDto>())).ToList(),
            warnings);

    private static Dictionary<string, MaterialEstimateStageJson> MergeStages(
        List<MaterialEstimateStageJson>? stages)
    {
        var map = new Dictionary<string, MaterialEstimateStageJson>(StringComparer.OrdinalIgnoreCase);
        if (stages is null) return map;

        foreach (var s in stages)
        {
            if (string.IsNullOrWhiteSpace(s.Name)) continue;
            var key = NormalizeStageName(s.Name.Trim());
            if (key is null) continue;
            map[key] = s;
        }

        return map;
    }

    private static string? NormalizeStageName(string name) =>
        name.ToLowerInvariant() switch
        {
            "demo" => "demo",
            "prep" => "prep",
            "build/install" or "build" or "install" or "build-install" => "build/install",
            "qa" => "qa",
            _ => null,
        };

    private static string BuildSystemPrompt(double radiusMiles) =>
        $"""
        You are a construction project assistant. You receive the job site address, a project overview, stage notes, and a JSON catalog of materials and equipment from the company inventory.
        **Distance rule (soft):** The user wants sourcing within about **{radiusMiles:g} miles** of the project address. Use supplier addresses and equipment rental locations in the catalog to judge whether each item could plausibly be used for this job within that range. You do not have exact coordinates—use geographic reasoning from city, region, and country text. If an item is clearly too far away or location text is missing/ambiguous in a way that suggests it is not local to the job, **do not** include it. If nothing in the catalog fits the distance rule for a stage, use an empty array for that stage's materials and/or equipment.         When in doubt, prefer omitting an item over stretching distance.
        Respond with ONLY a JSON object (no markdown): root key "stages" is an array of four objects with names demo, prep, build/install, qa; each has "materials" (materialId, quantity, optional note) and "equipment" (equipmentId, halfDay, optional note).
        Rules:
        - Include all four stage names exactly: demo, prep, build/install, qa.
        - Only use materialId and equipmentId values from the provided catalog lists.
        - Quantities must be positive decimals where relevant.
        - Respect the distance rule above when choosing catalog rows.
        - If nothing applies to a stage, use empty arrays for materials and equipment.
        - You may return empty arrays for every stage if nothing in the catalog fits the work and distance rule.
        """;

    private static string BuildUserPrompt(
        ProjectDetailsResponse details,
        IReadOnlyList<MaterialCatalogItemDto> materials,
        IReadOnlyList<EquipmentDto> equipment,
        MaterialEstimateRequestBody? overrides,
        double radiusMiles)
    {
        var overview = overrides?.Overview ?? details.Overview;
        var stageOverrides = overrides?.Stages;

        var sb = new StringBuilder();
        sb.AppendLine($"Target distance from job site: within approximately {radiusMiles:g} miles (apply the system distance rule).");
        sb.AppendLine("Project name: ").AppendLine(details.Name);
        sb.AppendLine("Project address (job site): ").AppendLine(details.Address);
        sb.AppendLine("Overview:").AppendLine(overview);
        sb.AppendLine("Stages:");
        foreach (var st in details.Stages.OrderBy(s => StageIndex(s.Name)))
        {
            var detailsText = st.Details;
            var notesText = st.Notes;
            if (stageOverrides is not null)
            {
                var o = stageOverrides.FirstOrDefault(x =>
                    string.Equals(x.Name, st.Name, StringComparison.Ordinal));
                if (o is not null)
                {
                    if (o.Details is not null) detailsText = o.Details;
                    if (o.Notes is not null) notesText = o.Notes;
                }
            }

            sb.AppendLine($"--- {st.Name} ---");
            sb.AppendLine("Details: ").AppendLine(detailsText);
            sb.AppendLine("Notes: ").AppendLine(notesText);
        }

        sb.AppendLine("Materials catalog (use only these materialId values; supplierAddress helps judge distance from job site):");
        sb.AppendLine(JsonSerializer.Serialize(materials.Select(m => new
        {
            m.Id,
            m.ProductName,
            m.Unit,
            m.ProductType,
            m.PricePerUnit,
            supplier = m.SupplierName,
            supplierAddress = m.SupplierAddress,
        })));

        sb.AppendLine("Equipment catalog (use only these equipmentId values):");
        sb.AppendLine(JsonSerializer.Serialize(equipment.Select(e => new
        {
            e.Id,
            e.Name,
            e.CostPerDay,
            e.CostHalfDay,
            placeToRentFrom = e.PlaceToRentFrom,
        })));

        return sb.ToString();
    }

    private static int StageIndex(string name) => name switch
    {
        "demo" => 0,
        "prep" => 1,
        "build/install" => 2,
        "qa" => 3,
        _ => 99,
    };

    private async Task<(string? Content, string? ErrorHint)> CallLlmJsonAsync(
        string systemPrompt,
        string userPrompt,
        CancellationToken cancellationToken)
    {
        var url = _options.ChatCompletionsUrl.Trim();
        var payload = new
        {
            model = _options.Model,
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt },
            },
            response_format = new { type = "json_object" },
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Content = JsonContent.Create(payload, options: new JsonSerializerOptions
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        });

        HttpResponseMessage res;
        try
        {
            res = await LlmHttp.SendAsync(req, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or IOException)
        {
            var detail = ex.InnerException?.Message is { } inner ? $"{ex.Message} ({inner})" : ex.Message;
            return (null,
                $"Could not reach the language model at {url}: {detail}. " +
                "Common causes: request body too large (full catalogs), server/proxy body limit, network drop mid-transfer, or timeout — try a smaller catalog test.");
        }

        var body = await res.Content.ReadAsStringAsync(cancellationToken);
        if (!res.IsSuccessStatusCode)
        {
            var snippet = body.Length > 400 ? body[..400] + "…" : body;
            return (null, $"Language model returned HTTP {(int)res.StatusCode}. Body: {snippet}");
        }

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(body);
        }
        catch (JsonException ex)
        {
            return (null, $"Language model response was not valid JSON: {ex.Message}");
        }

        using (doc)
        {
            if (!doc.RootElement.TryGetProperty("choices", out var choices) || choices.GetArrayLength() == 0)
            {
                var snippet = body.Length > 400 ? body[..400] + "…" : body;
                return (null, $"Language model JSON had no choices[] (unexpected shape). Snippet: {snippet}");
            }

            var first = choices[0];
            if (!first.TryGetProperty("message", out var message))
            {
                return (null, "Language model response: choices[0] missing message.");
            }

            if (message.TryGetProperty("content", out var contentEl))
            {
                var text = contentEl.GetString();
                if (!string.IsNullOrWhiteSpace(text))
                    return (text, null);

                return (null, "Language model returned empty message content.");
            }

            return (null, "Language model response: message missing content (some servers use a different schema).");
        }
    }
}
