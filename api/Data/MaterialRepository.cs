using Npgsql;

public class MaterialRepository(NpgsqlDataSource dataSource)
{
    public Task<IReadOnlyList<MaterialListItemDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        return dataSource.QueryAsync(
            """
            SELECT m.id, m.product_name, s.name, m.unit, m.product_type, m.price_per_unit, m.currency
            FROM material m
            LEFT JOIN supplier s ON s.id = m.supplier_id
            WHERE m.deleted_at IS NULL
            ORDER BY m.product_name
            """,
            reader => new MaterialListItemDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.IsDBNull(2) ? "" : reader.GetString(2),
                reader.IsDBNull(3) ? "" : reader.GetString(3),
                reader.IsDBNull(4) ? "" : reader.GetString(4),
                reader.IsDBNull(5) ? 0m : reader.GetDecimal(5),
                reader.IsDBNull(6) ? "USD" : reader.GetString(6)),
            cancellationToken: cancellationToken);
    }

    public async Task<Guid?> CreateAsync(MaterialBody body, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);

        var supplierId = await LookupSupplierIdByNameAsync(conn, body.SupplierName, cancellationToken);

        return await conn.ExecuteScalarAsync<Guid?>(
            """
            INSERT INTO material (product_name, supplier_id, unit, product_type, price_per_unit, currency)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            """,
            configureParameters: p =>
            {
                p.AddWithValue(body.ProductName);
                p.AddWithValue((object?)supplierId ?? DBNull.Value);
                p.AddWithValue(body.Unit);
                p.AddWithValue(body.ProductType);
                p.AddWithValue(body.PricePerUnit);
                p.AddWithValue(body.Currency);
            },
            isWrite: true,
            cancellationToken: cancellationToken);
    }

    public async Task<bool> UpdateAsync(Guid id, MaterialBody body, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);

        var supplierId = await LookupSupplierIdByNameAsync(conn, body.SupplierName, cancellationToken);

        return await conn.ExecuteScalarAsync<Guid?>(
            """
            UPDATE material SET product_name = $2, supplier_id = $3, unit = $4, product_type = $5, price_per_unit = $6, currency = $7, updated_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id
            """,
            configureParameters: p =>
            {
                p.AddWithValue(id);
                p.AddWithValue(body.ProductName);
                p.AddWithValue((object?)supplierId ?? DBNull.Value);
                p.AddWithValue(body.Unit);
                p.AddWithValue(body.ProductType);
                p.AddWithValue(body.PricePerUnit);
                p.AddWithValue(body.Currency);
            },
            isWrite: true,
            cancellationToken: cancellationToken) is not null;
    }

    public async Task<bool> SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await dataSource.ExecuteNonQueryAsync(
            "UPDATE material SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
            p => p.AddWithValue(id),
            cancellationToken) > 0;
    }

    private static Task<Guid?> LookupSupplierIdByNameAsync(NpgsqlConnection conn, string? name, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(name)) return Task.FromResult<Guid?>(null);

        return conn.ExecuteScalarAsync<Guid?>(
            "SELECT id FROM supplier WHERE name = $1 AND deleted_at IS NULL LIMIT 1",
            configureParameters: p => p.AddWithValue(name),
            cancellationToken: cancellationToken);
    }
}
