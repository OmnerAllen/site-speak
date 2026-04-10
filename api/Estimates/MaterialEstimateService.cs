using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using SiteSpeak.Logic;
using SiteSpeak.Llm;

namespace SiteSpeak.Estimates;

public sealed class MaterialEstimateService(
    MaterialRepository materials,
    EquipmentRepository equipment,
    ProjectRepository projects,
    ILlmChatClient llm)
{
    private const int MaxToolLoopIterations = 16;

    /// <summary>
    /// Builds prompts, calls the LLM on the server (tool loop), and returns draft stages for the UI.
    /// </summary>
    public async Task<MaterialEstimateCompleteResponse?> RunMaterialEstimateAsync(
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
            return MaterialEstimateCompleteResponse.EmptyCatalog(warnings);
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
            return MaterialEstimateCompleteResponse.EmptyCatalog(warnings);
        }

        var systemPrompt = BuildSystemPromptForTools(radiusMiles);
        var userPrompt = BuildUserPrompt(details, catalog, allEquipment, request, radiusMiles);

        var messagesArray = new JsonArray
        {
            JsonSerializer.SerializeToNode(new { role = "system", content = systemPrompt }),
            JsonSerializer.SerializeToNode(new { role = "user", content = userPrompt }),
        };

        var allowedMat = catalog.Select(m => m.Id.ToString()).ToHashSet(StringComparer.Ordinal);
        var allowedEq = allEquipment.Select(e => e.Id.ToString()).ToHashSet(StringComparer.Ordinal);
        var matLabels = catalog.ToDictionary(m => m.Id.ToString(), m => m.ProductName);
        var eqLabels = allEquipment.ToDictionary(e => e.Id.ToString(), e => e.Name);

        var toolsNode = JsonNode.Parse(MaterialEstimateToolDefinition.Tools.GetRawText())!;
        var toolChoiceNode = JsonNode.Parse(MaterialEstimateToolDefinition.ToolChoiceAuto.GetRawText())!;

        var highlightPanel = false;
        var appliedSubmit = false;
        IReadOnlyList<MaterialEstimateDraftStageDto>? draftStages = null;
        var exitedWithFinalTurn = false;

        for (var i = 0; i < MaxToolLoopIterations; i++)
        {
            var (raw, parsed, err) = await PostCompletionsWithToolChoiceFallbackAsync(
                messagesArray,
                toolsNode,
                toolChoiceNode,
                cancellationToken);

            if (err is not null)
                throw new InvalidOperationException(err);

            if (parsed is null)
                throw new InvalidOperationException("Language model response could not be parsed.");

            if (string.IsNullOrEmpty(raw))
                throw new InvalidOperationException("Language model returned an empty body.");

            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.TryGetProperty("error", out var errEl) && errEl.ValueKind != JsonValueKind.Null)
            {
                var msg = errEl.TryGetProperty("message", out var mEl) ? mEl.GetString() : errEl.GetRawText();
                throw new InvalidOperationException(msg ?? "Language model returned an error.");
            }

            var choice = doc.RootElement.GetProperty("choices")[0];
            var finishReason = choice.TryGetProperty("finish_reason", out var frEl) ? frEl.GetString() : null;
            if (!choice.TryGetProperty("message", out var messageEl))
                throw new InvalidOperationException("Language model response had no choices[0].message.");

            var toolCalls = parsed.ToolCalls;
            if (toolCalls.Count > 0 || string.Equals(finishReason, "tool_calls", StringComparison.Ordinal))
            {
                messagesArray.Add(JsonNode.Parse(messageEl.GetRawText())!);

                foreach (var tc in toolCalls)
                {
                    if (string.IsNullOrEmpty(tc.Name)) continue;

                    string toolContent;
                    if (string.Equals(tc.Name, MaterialEstimateToolDefinition.HighlightToolName, StringComparison.Ordinal))
                    {
                        highlightPanel = true;
                        toolContent = "Materials & equipment panel set to radioactive accent.";
                    }
                    else if (string.Equals(tc.Name, MaterialEstimateToolDefinition.ToolName, StringComparison.Ordinal))
                    {
                        var proposal = MaterialEstimateProposalJson.TryParse(tc.Arguments);
                        if (proposal is null)
                        {
                            var coerced = MaterialEstimateProposalJson.TryCoerceRootStagesJson(tc.Arguments);
                            if (coerced is not null)
                                proposal = MaterialEstimateProposalJson.TryParse(coerced);
                        }

                        if (proposal is null)
                            throw new InvalidOperationException("Invalid submit_material_estimate arguments JSON.");

                        draftStages = ProposalToDraft(proposal, allowedMat, allowedEq, matLabels, eqLabels);
                        appliedSubmit = true;
                        toolContent = "Estimate applied.";
                    }
                    else
                    {
                        throw new InvalidOperationException($"No handler registered for tool \"{tc.Name}\".");
                    }

                    messagesArray.Add(new JsonObject
                    {
                        ["role"] = "tool",
                        ["content"] = toolContent,
                        ["tool_call_id"] = tc.Id,
                    });
                }

                continue;
            }

            exitedWithFinalTurn = true;
            break;
        }

        if (!exitedWithFinalTurn)
            throw new InvalidOperationException("Tool-calling loop exceeded max iterations.");

        return new MaterialEstimateCompleteResponse(
            warnings,
            MaterialEstimateCompleteStatus.Ok,
            highlightPanel,
            appliedSubmit,
            draftStages);
    }

    private async Task<(string? Raw, LlmChatCompletionResult? Parsed, string? Error)> PostCompletionsWithToolChoiceFallbackAsync(
        JsonArray messagesArray,
        JsonNode toolsNode,
        JsonNode toolChoiceNode,
        CancellationToken cancellationToken)
    {
        var withChoice = BuildCompletionBody(messagesArray, toolsNode, toolChoiceNode);
        var (raw, parsed, err) = await llm.PostChatCompletionsAsync(withChoice, cancellationToken);
        if (err is null) return (raw, parsed, null);

        var withoutChoice = BuildCompletionBody(messagesArray, toolsNode, toolChoice: null);
        return await llm.PostChatCompletionsAsync(withoutChoice, cancellationToken);
    }

    private static JsonElement BuildCompletionBody(JsonArray messagesArray, JsonNode toolsNode, JsonNode? toolChoice)
    {
        var o = new JsonObject
        {
            ["messages"] = JsonSerializer.SerializeToNode(messagesArray)!,
            ["tools"] = toolsNode.DeepClone(),
        };
        if (toolChoice is not null)
            o["tool_choice"] = toolChoice.DeepClone();

        return JsonSerializer.SerializeToElement(o, JsonSerializerOptions.Web);
    }

    private static IReadOnlyList<MaterialEstimateDraftStageDto> ProposalToDraft(
        MaterialEstimateProposal proposal,
        HashSet<string> allowedMat,
        HashSet<string> allowedEq,
        IReadOnlyDictionary<string, string> matLabels,
        IReadOnlyDictionary<string, string> eqLabels)
    {
        var merged = new Dictionary<string, MaterialEstimateStageJson>(StringComparer.OrdinalIgnoreCase);
        foreach (var s in proposal.Stages ?? [])
        {
            var key = NormalizeStageName(s.Name);
            if (key is not null)
                merged[key] = s;
        }

        string[] order = ["demo", "prep", "build/install", "qa"];
        var result = new List<MaterialEstimateDraftStageDto>(4);
        foreach (var name in order)
        {
            merged.TryGetValue(name, out var stage);
            var mats = (stage?.Materials ?? [])
                .Where(m => allowedMat.Contains(m.MaterialId.ToString()) && m.Quantity > 0)
                .Select(m =>
                {
                    var id = m.MaterialId.ToString();
                    return new MaterialEstimateDraftMaterialLineDto(id, (double)m.Quantity, matLabels.GetValueOrDefault(id, id));
                })
                .ToList();

            var eqs = (stage?.Equipment ?? [])
                .Where(e => allowedEq.Contains(e.EquipmentId.ToString()))
                .Select(e =>
                {
                    var id = e.EquipmentId.ToString();
                    return new MaterialEstimateDraftEquipmentLineDto(id, e.HalfDay, eqLabels.GetValueOrDefault(id, id));
                })
                .ToList();

            result.Add(new MaterialEstimateDraftStageDto(name, mats, eqs));
        }

        return result;
    }

    private static string? NormalizeStageName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return null;
        var n = name.Trim().ToLowerInvariant();
        return n switch
        {
            "demo" => "demo",
            "prep" => "prep",
            "qa" => "qa",
            "build/install" or "build" or "install" or "build-install" => "build/install",
            _ => null,
        };
    }

    private static string BuildSystemPromptForTools(double radiusMiles) =>
        $"""
        You are a construction project assistant. You receive the job site address, a project overview, stage notes, and a JSON catalog of materials and equipment from the company inventory.
        **Catalog scope:** The materials and equipment lists are already limited by the server to suppliers and rental yards within about **{radiusMiles:g} miles** of the job site (when coordinates are available). Use only IDs from those lists.
        First call **{MaterialEstimateToolDefinition.HighlightToolName}** once (no arguments). That signals the UI to apply the Site Speak **radioactive** accent color to the Materials & equipment sidebar so the user sees that tools are running.
        Then call **{MaterialEstimateToolDefinition.ToolName}** to submit your estimate (structured stages with materials and equipment). You may issue both tool calls in the same assistant turn. Do not answer with plain prose only—use the tools as described.
        Rules:
        - Include all four stage names exactly in the tool arguments: demo, prep, build/install, qa.
        - Only use materialId and equipmentId values from the provided catalog lists.
        - Quantities must be positive decimals where relevant.
        - If nothing applies to a stage, use empty arrays for materials and equipment in that stage.
        - You may submit empty arrays for every stage if nothing in the catalog fits the work.
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

        sb.AppendLine();
        sb.AppendLine(
            $"Reminder: call {MaterialEstimateToolDefinition.HighlightToolName} first (radioactive sidebar highlight), then {MaterialEstimateToolDefinition.ToolName} with your line items.");

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
}
