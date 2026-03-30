public record SupplierBody(string Name, string Address, string? Phone);
public record EquipmentBody(string Name, decimal CostPerDay, decimal CostHalfDay, string PlaceToRentFrom);
public record MaterialBody(string ProductName, string? SupplierName, string Unit, string ProductType, decimal PricePerUnit, string Currency);
public record ProjectBody(string Name, string Address);
