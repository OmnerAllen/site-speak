public record UserMeResponse(
    Guid Id,
    string KeycloakSub,
    string Email,
    Guid? EmployeeId,
    Guid? CompanyId,
    string? CompanyName,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Permissions);

public record SupplierDto(Guid Id, string Name, string Address, string Phone, double? Latitude, double? Longitude);

public record EquipmentDto(
    Guid Id,
    string Name,
    decimal CostPerDay,
    decimal CostHalfDay,
    Guid? RentalSupplierId,
    string RentalSupplierName,
    double? RentalSupplierLatitude,
    double? RentalSupplierLongitude);

public record MaterialListItemDto(
    Guid Id,
    string ProductName,
    string SupplierName,
    string Unit,
    string ProductType,
    decimal PricePerUnit);

/// <summary>Material row with supplier address for geo filtering and LLM catalog.</summary>
public record MaterialCatalogItemDto(
    Guid Id,
    string ProductName,
    Guid? SupplierId,
    string SupplierName,
    string SupplierAddress,
    double? SupplierLatitude,
    double? SupplierLongitude,
    string Unit,
    string ProductType,
    decimal PricePerUnit);

public record ProjectDto(
    Guid Id,
    string Name,
    string Address,
    string Overview,
    double? Latitude,
    double? Longitude,
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
    double? Latitude,
    double? Longitude,
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

public record StageMaterialResourceDto(
    Guid MaterialId,
    string ProductName,
    decimal Quantity);

public record StageEquipmentResourceDto(
    Guid EquipmentId,
    string Name,
    bool HalfDay,
    string DateOfUse);

public record StageResourcesStageDto(
    string Name,
    IReadOnlyList<StageMaterialResourceDto> Materials,
    IReadOnlyList<StageEquipmentResourceDto> Equipment);

public record ProjectStageResourcesResponse(IReadOnlyList<StageResourcesStageDto> Stages);

/// <summary>API response for POST material-estimate (enriched for UI).</summary>
public record MaterialEstimateApiResponse(
    IReadOnlyList<MaterialEstimateStageApiDto> Stages,
    IReadOnlyList<string> Warnings,
    string? LlmRawContent = null);

/// <summary>Seed for client-side tool-calling loop: messages + tools + ID allowlists and display labels.</summary>
public record MaterialEstimateSeedResponse(
    IReadOnlyList<string> Warnings,
    System.Text.Json.JsonElement Messages,
    System.Text.Json.JsonElement Tools,
    System.Text.Json.JsonElement ToolChoice,
    IReadOnlyList<string> AllowedMaterialIds,
    IReadOnlyList<string> AllowedEquipmentIds,
    IReadOnlyDictionary<string, string> MaterialLabels,
    IReadOnlyDictionary<string, string> EquipmentLabels);

public record MaterialEstimateStageApiDto(
    string Name,
    IReadOnlyList<MaterialEstimateMaterialLineApiDto> Materials,
    IReadOnlyList<MaterialEstimateEquipmentLineApiDto> Equipment);

public record MaterialEstimateMaterialLineApiDto(
    Guid MaterialId,
    string ProductName,
    decimal Quantity,
    string? Note);

public record MaterialEstimateEquipmentLineApiDto(
    Guid EquipmentId,
    string Name,
    bool HalfDay,
    string? Note);

public enum StageResourcesReplaceResult
{
    Ok,
    ProjectNotFound,
    InvalidStage,
    InvalidMaterial,
    InvalidEquipment
}
