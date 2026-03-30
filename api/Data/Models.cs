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
    decimal PricePerUnit,
    string Currency);

public record ProjectDto(Guid Id, string Name, string Address, string Overview, DateTime CreatedAt, DateTime UpdatedAt);

public record StageDto(Guid Id, string Name, string Details, string Notes, DateTime CreatedAt, DateTime UpdatedAt);

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
