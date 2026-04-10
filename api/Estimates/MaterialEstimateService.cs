using System.Linq;
using System.Text;
using System.Text.Json;
using SiteSpeak.Logic;

namespace SiteSpeak.Estimates;

public sealed class MaterialEstimateService(
    MaterialRepository materials,
    EquipmentRepository equipment,
    ProjectRepository projects)
{
    /// <summary>Builds LLM seed (messages, tools, allowlists) for the client-side tool-calling loop. Does not call the model.</summary>
    public async Task<MaterialEstimateSeedResponse?> BuildEstimateSeedAsync(
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
            return EmptySeed(warnings);
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
            return EmptySeed(warnings);
        }

        var systemPrompt = BuildSystemPromptForTools(radiusMiles);
        var userPrompt = BuildUserPrompt(details, catalog, allEquipment, request, radiusMiles);

        var messagesPayload = new[]
        {
            new { role = "system", content = systemPrompt },
            new { role = "user", content = userPrompt },
        };

        var messagesEl = JsonSerializer.SerializeToElement(messagesPayload);

        var allowedMat = catalog.Select(m => m.Id.ToString()).ToList();
        var allowedEq = allEquipment.Select(e => e.Id.ToString()).ToList();
        var matLabels = catalog.ToDictionary(m => m.Id.ToString(), m => m.ProductName);
        var eqLabels = allEquipment.ToDictionary(e => e.Id.ToString(), e => e.Name);

        return new MaterialEstimateSeedResponse(
            warnings,
            messagesEl,
            MaterialEstimateToolDefinition.Tools,
            MaterialEstimateToolDefinition.ToolChoiceAuto,
            allowedMat,
            allowedEq,
            matLabels,
            eqLabels);
    }

    private static MaterialEstimateSeedResponse EmptySeed(IReadOnlyList<string> warnings)
    {
        var emptyMessages = JsonSerializer.SerializeToElement(Array.Empty<object>());
        var emptyTools = JsonSerializer.SerializeToElement(Array.Empty<object>());
        var autoChoice = JsonSerializer.SerializeToElement(new { type = "auto" });
        return new MaterialEstimateSeedResponse(
            warnings,
            emptyMessages,
            emptyTools,
            autoChoice,
            Array.Empty<string>(),
            Array.Empty<string>(),
            new Dictionary<string, string>(),
            new Dictionary<string, string>());
    }

    private static string BuildSystemPromptForTools(double radiusMiles) =>
        $"""
        You are a construction project assistant. You receive the job site address, a project overview, stage notes, and a JSON catalog of materials and equipment from the company inventory.
        **Catalog scope:** The materials and equipment lists are already limited by the server to suppliers and rental yards within about **{radiusMiles:g} miles** of the job site (when coordinates are available). Use only IDs from those lists.
        First call **{MaterialEstimateToolDefinition.HighlightToolName}** once (no arguments). That applies the Site Speak **radioactive** accent color to the Materials & equipment sidebar so the user sees that tools are running.
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
