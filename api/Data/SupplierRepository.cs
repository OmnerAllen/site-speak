using Npgsql;

public class SupplierRepository(NpgsqlDataSource dataSource)
{
    public async Task<IReadOnlyList<SupplierDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id, name, address, phone FROM supplier WHERE deleted_at IS NULL ORDER BY name";

        var list = new List<SupplierDto>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            list.Add(new SupplierDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.IsDBNull(3) ? "" : reader.GetString(3)));
        }

        return list;
    }

    public async Task<SupplierDto?> CreateAsync(SupplierBody body, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO supplier (name, address, phone)
            VALUES ($1, $2, $3)
            RETURNING id, name, address, phone
            """;
        cmd.Parameters.AddWithValue(body.Name);
        cmd.Parameters.AddWithValue(body.Address);
        cmd.Parameters.AddWithValue((object?)body.Phone ?? DBNull.Value);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return null;
        return new SupplierDto(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.IsDBNull(3) ? "" : reader.GetString(3));
    }

    public async Task<SupplierDto?> UpdateAsync(Guid id, SupplierBody body, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE supplier SET name = $2, address = $3, phone = $4, updated_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, name, address, phone
            """;
        cmd.Parameters.AddWithValue(id);
        cmd.Parameters.AddWithValue(body.Name);
        cmd.Parameters.AddWithValue(body.Address);
        cmd.Parameters.AddWithValue((object?)body.Phone ?? DBNull.Value);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return null;
        return new SupplierDto(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.IsDBNull(3) ? "" : reader.GetString(3));
    }

    public async Task<bool> SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE supplier SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL";
        cmd.Parameters.AddWithValue(id);
        return await cmd.ExecuteNonQueryAsync(cancellationToken) > 0;
    }
}
