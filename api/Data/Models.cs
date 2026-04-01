public record UserMeResponse(
    Guid Id,
    string KeycloakSub,
    string Email,
    Guid? EmployeeId,
    Guid? CompanyId,
    string? CompanyName,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Permissions);

public record SupplierDto(Guid Id, string Name, string Address, string Phone);

public record EquipmentDto(Guid Id, string Name, decimal CostPerDay, decimal CostHalfDay, string PlaceToRentFrom);

public record MaterialListItemDto(
    Guid Id,
    string ProductName,
    string SupplierName,
    string Unit,
    string ProductType,
    decimal PricePerUnit);

public record ProjectDto(
    Guid Id,
    string Name,
    string Address,
    string Overview,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? PlannedStartDate,
    string? PlannedEndDate);

public record EmployeeDto(Guid Id, string Name, string Type);

public record WorkLogListItemDto(
    Guid Id,
    Guid EmployeeId,
    Guid ProjectId,
    string EmployeeName,
    string ProjectName,
    DateTime StartedAt,
    DateTime EndedAt,
    string? Notes);

public record StageDto(
    Guid Id,
    string Name,
    string Details,
    string Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? PlannedStartDate,
    string? PlannedEndDate);

/// <summary>Stages with planned dates for GET /my/schedule.</summary>
public record ScheduleStageDto(
    Guid Id,
    string Name,
    string? PlannedStartDate,
    string? PlannedEndDate);

/// <summary>Project row for schedule view; project planned dates are MIN/MAX of stage dates.</summary>
public record ScheduleProjectDto(
    Guid Id,
    string Name,
    string Address,
    string? PlannedStartDate,
    string? PlannedEndDate,
    IReadOnlyList<ScheduleStageDto> Stages);

public enum SchedulePatchResult
{
    Ok,
    ProjectNotFound,
    InvalidStage
}

public record ProjectDetailsResponse(
    Guid Id,
    string Name,
    string Address,
    string Overview,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<StageDto> Stages);

public enum ProjectDetailsUpdateResult
{
    Ok,
    NotFound,
    StagesRequired,
    InvalidStage
}
