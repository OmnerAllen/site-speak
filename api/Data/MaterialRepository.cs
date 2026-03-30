using Npgsql;

public class MaterialRepository(NpgsqlDataSource dataSource)
{
    public async Task<IReadOnlyList<MaterialListItemDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT m.id, m.product_name, s.name, m.unit, m.product_type, m.price_per_unit, m.currency
            FROM material m
            LEFT JOIN supplier s ON s.id = m.supplier_id
            WHERE m.deleted_at IS NULL
            ORDER BY m.product_name
            """;

        var list = new List<MaterialListItemDto>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            list.Add(new MaterialListItemDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.IsDBNull(2) ? "" : reader.GetString(2),
                reader.IsDBNull(3) ? "" : reader.GetString(3),
                reader.IsDBNull(4) ? "" : reader.GetString(4),
                reader.IsDBNull(5) ? 0m : reader.GetDecimal(5),
                reader.IsDBNull(6) ? "USD" : reader.GetString(6)));
        }

        return list;
    }

    public async Task<Guid?> CreateAsync(MaterialBody body, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);

        var supplierId = await LookupSupplierIdByNameAsync(conn, body.SupplierName, cancellationToken);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO material (product_name, supplier_id, unit, product_type, price_per_unit, currency)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            """;
        cmd.Parameters.AddWithValue(body.ProductName);
        cmd.Parameters.AddWithValue((object?)supplierId ?? DBNull.Value);
        cmd.Parameters.AddWithValue(body.Unit);
        cmd.Parameters.AddWithValue(body.ProductType);
        cmd.Parameters.AddWithValue(body.PricePerUnit);
        cmd.Parameters.AddWithValue(body.Currency);

        var id = await cmd.ExecuteScalarAsync(cancellationToken);
        return id as Guid?;
    }

    public async Task<bool> UpdateAsync(Guid id, MaterialBody body, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);

        var supplierId = await LookupSupplierIdByNameAsync(conn, body.SupplierName, cancellationToken);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE material SET product_name = $2, supplier_id = $3, unit = $4, product_type = $5, price_per_unit = $6, currency = $7, updated_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id
            """;
        cmd.Parameters.AddWithValue(id);
        cmd.Parameters.AddWithValue(body.ProductName);
        cmd.Parameters.AddWithValue((object?)supplierId ?? DBNull.Value);
        cmd.Parameters.AddWithValue(body.Unit);
        cmd.Parameters.AddWithValue(body.ProductType);
        cmd.Parameters.AddWithValue(body.PricePerUnit);
        cmd.Parameters.AddWithValue(body.Currency);

        return await cmd.ExecuteScalarAsync(cancellationToken) is not null;
    }

    public async Task<bool> SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE material SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL";
        cmd.Parameters.AddWithValue(id);
        return await cmd.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    private static async Task<Guid?> LookupSupplierIdByNameAsync(NpgsqlConnection conn, string? name, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(name)) return null;

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id FROM supplier WHERE name = $1 AND deleted_at IS NULL LIMIT 1";
        cmd.Parameters.AddWithValue(name);
        var result = await cmd.ExecuteScalarAsync(cancellationToken);
        return result as Guid?;
    }
}
