public record SupplierBody(string Name, string Address, string? Phone);
public record EquipmentBody(string Name, decimal CostPerDay, decimal CostHalfDay, string PlaceToRentFrom);
public record MaterialBody(string ProductName, string? SupplierName, string Unit, string ProductType, decimal PricePerUnit);
public record ProjectBody(string Name, string Address, string? Overview = null);

/// <summary>Updates planned dates on stages. Project timeline is derived from MIN/MAX of stages.</summary>
public record ProjectScheduleBody(IReadOnlyList<StageScheduleItem>? Stages);

public record StageScheduleItem(Guid StageId, string? PlannedStartDate, string? PlannedEndDate);

public record EmployeeBody(string Name, string Type);

public record WorkLogBody(Guid EmployeeId, Guid ProjectId, DateTime StartedAt, DateTime EndedAt, string? Notes);
public record StageDetailsBody(string Name, string? Details, string? Notes);
public record ProjectDetailsBody(string Name, string Address, string? Overview, List<StageDetailsBody>? Stages);
