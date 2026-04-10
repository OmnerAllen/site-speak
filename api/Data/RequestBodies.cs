public record SupplierBody(string Name, string Address, string? Phone);
public record EquipmentBody(string Name, decimal CostPerDay, decimal CostHalfDay, Guid RentalSupplierId);
public record MaterialBody(string ProductName, string? SupplierName, string Unit, string ProductType, decimal PricePerUnit);
public record ProjectBody(string Name, string Address, string? Overview = null);

/// <summary>Updates planned dates on stages. Project timeline is derived from MIN/MAX of stages.</summary>
public record ProjectScheduleBody(IReadOnlyList<StageScheduleItem>? Stages);

public record StageScheduleItem(Guid StageId, string? PlannedStartDate, string? PlannedEndDate);

public record EmployeeBody(string Name, string Type);

public record WorkLogBody(Guid EmployeeId, Guid ProjectId, DateTime StartedAt, DateTime EndedAt, string? Notes);
public record StageDetailsBody(string Name, string? Details, string? Notes);
public record ProjectDetailsBody(string Name, string Address, string? Overview, List<StageDetailsBody>? Stages);

/// <summary>POST /material-estimate. Optional overview/stages override unsaved editor text for the LLM prompt.</summary>
public record MaterialEstimateRequestBody
{
    /// <summary>Max distance in miles for server-side catalog filtering (Haversine). Default 50.</summary>
    public double? RadiusMiles { get; init; }
    public string? Overview { get; init; }
    public List<MaterialEstimateStagePromptBody>? Stages { get; init; }
}

public record MaterialEstimateStagePromptBody(string Name, string? Details, string? Notes);

public record StageResourcesPutBody(List<StageResourceStageBody>? Stages);

public record StageResourceStageBody(
    string Name,
    List<StageResourceMaterialBody>? Materials,
    List<StageResourceEquipmentBody>? Equipment);

public record StageResourceMaterialBody(Guid MaterialId, decimal Quantity);

public record StageResourceEquipmentBody(Guid EquipmentId, bool HalfDay);

/// <summary>POST /my/ai/chat — OpenAI-style roles: system, user, assistant.</summary>
public record AiChatMessageBody(string Role, string? Content);

public record AiChatRequestBody(IReadOnlyList<AiChatMessageBody>? Messages);
