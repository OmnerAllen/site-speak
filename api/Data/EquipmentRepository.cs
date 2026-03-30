using Npgsql;

public class EquipmentRepository(NpgsqlDataSource dataSource)
{
    public async Task<IReadOnlyList<EquipmentDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id, name, cost_per_day, cost_half_day, place_to_rent_from FROM equipment WHERE deleted_at IS NULL ORDER BY name";

        var list = new List<EquipmentDto>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            list.Add(new EquipmentDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetDecimal(2),
                reader.GetDecimal(3),
                reader.IsDBNull(4) ? "" : reader.GetString(4)));
        }

        return list;
    }

    public async Task<EquipmentDto?> CreateAsync(EquipmentBody body, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO equipment (name, cost_per_day, cost_half_day, place_to_rent_from)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, cost_per_day, cost_half_day, place_to_rent_from
            """;
        cmd.Parameters.AddWithValue(body.Name);
        cmd.Parameters.AddWithValue(body.CostPerDay);
        cmd.Parameters.AddWithValue(body.CostHalfDay);
        cmd.Parameters.AddWithValue(body.PlaceToRentFrom);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return null;
        return new EquipmentDto(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetDecimal(2),
            reader.GetDecimal(3),
            reader.IsDBNull(4) ? "" : reader.GetString(4));
    }

    public async Task<EquipmentDto?> UpdateAsync(Guid id, EquipmentBody body, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE equipment SET name = $2, cost_per_day = $3, cost_half_day = $4, place_to_rent_from = $5, updated_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, name, cost_per_day, cost_half_day, place_to_rent_from
            """;
        cmd.Parameters.AddWithValue(id);
        cmd.Parameters.AddWithValue(body.Name);
        cmd.Parameters.AddWithValue(body.CostPerDay);
        cmd.Parameters.AddWithValue(body.CostHalfDay);
        cmd.Parameters.AddWithValue(body.PlaceToRentFrom);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return null;
        return new EquipmentDto(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetDecimal(2),
            reader.GetDecimal(3),
            reader.IsDBNull(4) ? "" : reader.GetString(4));
    }

    public async Task<bool> SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE equipment SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL";
        cmd.Parameters.AddWithValue(id);
        return await cmd.ExecuteNonQueryAsync(cancellationToken) > 0;
    }
}
