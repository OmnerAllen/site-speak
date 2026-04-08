using System.Linq;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using SiteSpeak.Logic;
using SiteSpeak.Llm;

namespace SiteSpeak.Estimates;

public sealed class MaterialEstimateService(
    ILlmChatClient llm,
    IOptions<MaterialEstimateOptions> options,
    MaterialRepository materials,
    EquipmentRepository equipment,
    ProjectRepository projects,
    IHostEnvironment hostEnvironment)
{
    private readonly MaterialEstimateOptions _options = options.Value;
    private static readonly string[] StageOrder = ["demo", "prep", "build/install", "qa"];

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
            return EmptyResponse(warnings, null);
        }

        if (!details.Latitude.HasValue || !details.Longitude.HasValue)
        {
            warnings.Add("Project job site has no coordinates; distance filter was skipped (full catalog sent to the model).");
        }
        else
        {
            var jobLat = details.Latitude.Value;
            var jobLon = details.Longitude.Value;
            var matSkippedNoCoords = 0;
            var matOutside = 0;
            var filteredCatalog = new List<MaterialCatalogItemDto>();
            foreach (var m in catalog)
            {
                if (!m.SupplierLatitude.HasValue || !m.SupplierLongitude.HasValue)
                {
                    matSkippedNoCoords++;
                    continue;
                }

                if (GeoDistance.MilesBetween(jobLat, jobLon, m.SupplierLatitude.Value, m.SupplierLongitude.Value) <= radiusMiles)
                    filteredCatalog.Add(m);
                else
                    matOutside++;
            }

            if (matSkippedNoCoords > 0)
                warnings.Add($"{matSkippedNoCoords} material(s) omitted (supplier missing coordinates).");
            if (matOutside > 0)
                warnings.Add($"{matOutside} material(s) omitted (outside {radiusMiles:g} mi of job site).");

            var eqSkippedNoCoords = 0;
            var eqOutside = 0;
            var filteredEquipment = new List<EquipmentDto>();
            foreach (var e in allEquipment)
            {
                if (!e.RentalSupplierLatitude.HasValue || !e.RentalSupplierLongitude.HasValue)
                {
                    eqSkippedNoCoords++;
                    continue;
                }

                if (GeoDistance.MilesBetween(jobLat, jobLon, e.RentalSupplierLatitude.Value, e.RentalSupplierLongitude.Value) <= radiusMiles)
                    filteredEquipment.Add(e);
                else
                    eqOutside++;
            }

            if (eqSkippedNoCoords > 0)
                warnings.Add($"{eqSkippedNoCoords} equipment row(s) omitted (rental supplier missing coordinates).");
            if (eqOutside > 0)
                warnings.Add($"{eqOutside} equipment row(s) omitted (outside {radiusMiles:g} mi of job site).");

            catalog = filteredCatalog;
            allEquipment = filteredEquipment;
        }

        if (catalog.Count == 0 && allEquipment.Count == 0)
        {
            warnings.Add("No materials or equipment remain after distance filtering for this job site and radius.");
            return EmptyResponse(warnings, null);
        }

        var materialById = catalog.ToDictionary(m => m.Id);
        var equipmentById = allEquipment.ToDictionary(e => e.Id);

        var systemPrompt = BuildSystemPrompt(radiusMiles);
        var userPrompt = BuildUserPrompt(details, catalog, allEquipment, request, radiusMiles);

        var messages = new[]
        {
            new LlmChatMessage("system", systemPrompt),
            new LlmChatMessage("user", userPrompt),
        };
        var (json, rawLlmError) = await llm.CompleteAsync(messages, jsonObjectResponse: true, cancellationToken);
        var llmError = rawLlmError is not null ? AppendCatalogHintIfReachability(rawLlmError) : null;
        if (json is null)
        {
            warnings.Add(llmError ?? "Language model did not return usable JSON.");
            return EmptyResponse(warnings, null);
        }

        var extracted = MaterialEstimateProposalJson.ExtractJsonObject(json) ?? json;
        var candidate = MaterialEstimateProposalJson.TryCoerceRootStagesJson(extracted) ?? extracted;
        var proposal = MaterialEstimateProposalJson.TryParse(candidate);
        if (proposal is null)
        {
            var snippet = candidate.Length > 400 ? candidate[..400] + "…" : candidate;
            warnings.Add($"Failed to parse estimate JSON (invalid JSON). Snippet: {snippet}");
            return EmptyResponse(warnings, json);
        }

        if (proposal.Stages is null)
        {
            var snippet = candidate.Length > 400 ? candidate[..400] + "…" : candidate;
            warnings.Add(
                $"Failed to parse estimate JSON: root must include a non-null \"stages\" array. Snippet: {snippet}");
            return EmptyResponse(warnings, json);
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

        return new MaterialEstimateApiResponse(responseStages, warnings, LlmDebugContent(json));
    }

    private string? LlmDebugContent(string? rawFromModel) =>
        rawFromModel is not null
        && hostEnvironment.IsDevelopment()
        && _options.IncludeLlmRawContentInResponse
            ? rawFromModel
            : null;

    private MaterialEstimateApiResponse EmptyResponse(IReadOnlyList<string> warnings, string? llmRawFromModel) =>
        new(
            StageOrder.Select(n => new MaterialEstimateStageApiDto(n, Array.Empty<MaterialEstimateMaterialLineApiDto>(),
                Array.Empty<MaterialEstimateEquipmentLineApiDto>())).ToList(),
            warnings,
            LlmDebugContent(llmRawFromModel));

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
        **Catalog scope:** The materials and equipment lists are already limited by the server to suppliers and rental yards within about **{radiusMiles:g} miles** of the job site (when coordinates are available). Use only IDs from those lists.
        Respond with ONLY a JSON object (no markdown): root key "stages" is an array of four objects with names demo, prep, build/install, qa; each has "materials" (materialId, quantity, optional note) and "equipment" (equipmentId, halfDay as boolean true/false for half-day rental vs full day, optional note).
        Rules:
        - Include all four stage names exactly: demo, prep, build/install, qa.
        - Only use materialId and equipmentId values from the provided catalog lists.
        - Quantities must be positive decimals where relevant.
        - If nothing applies to a stage, use empty arrays for materials and equipment.
        - You may return empty arrays for every stage if nothing in the catalog fits the work.
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
        sb.AppendLine($"Target distance from job site: within approximately {radiusMiles:g} miles (catalog pre-filtered server-side when job coordinates exist).");
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

        sb.AppendLine("Equipment catalog (use only these equipmentId values; rentalSupplier is the rental yard):");
        sb.AppendLine(JsonSerializer.Serialize(equipment.Select(e => new
        {
            e.Id,
            e.Name,
            e.CostPerDay,
            e.CostHalfDay,
            rentalSupplier = e.RentalSupplierName,
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

    private static string AppendCatalogHintIfReachability(string error) =>
        error.StartsWith("Could not reach the language model at", StringComparison.Ordinal)
            ? error + " For material estimates: large catalog payloads or slow uploads can contribute — try a smaller radius test."
            : error;
}
