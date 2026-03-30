using Npgsql;

public class SupplierRepository(NpgsqlDataSource dataSource)
{
    public Task<IReadOnlyList<SupplierDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        return dataSource.QueryAsync(
            "SELECT id, name, address, phone FROM supplier WHERE deleted_at IS NULL ORDER BY name",
            reader => new SupplierDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.IsDBNull(3) ? "" : reader.GetString(3)),
            cancellationToken: cancellationToken);
    }

    public Task<SupplierDto?> CreateAsync(SupplierBody body, CancellationToken cancellationToken = default)
    {
        return dataSource.QuerySingleOrDefaultAsync(
            """
            INSERT INTO supplier (name, address, phone)
            VALUES ($1, $2, $3)
            RETURNING id, name, address, phone
            """,
            reader => new SupplierDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.IsDBNull(3) ? "" : reader.GetString(3)),
            p =>
            {
                p.AddWithValue(body.Name);
                p.AddWithValue(body.Address);
                p.AddWithValue((object?)body.Phone ?? DBNull.Value);
            },
            isWrite: true,
            cancellationToken);
    }

    public Task<SupplierDto?> UpdateAsync(Guid id, SupplierBody body, CancellationToken cancellationToken = default)
    {
        return dataSource.QuerySingleOrDefaultAsync(
            """
            UPDATE supplier SET name = $2, address = $3, phone = $4, updated_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, name, address, phone
            """,
            reader => new SupplierDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.IsDBNull(3) ? "" : reader.GetString(3)),
            p =>
            {
                p.AddWithValue(id);
                p.AddWithValue(body.Name);
                p.AddWithValue(body.Address);
                p.AddWithValue((object?)body.Phone ?? DBNull.Value);
            },
            isWrite: true,
            cancellationToken);
    }

    public async Task<bool> SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await dataSource.ExecuteNonQueryAsync(
            "UPDATE supplier SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
            p => p.AddWithValue(id),
            cancellationToken) > 0;
    }
}
