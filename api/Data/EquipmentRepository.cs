using Npgsql;

public class EquipmentRepository(NpgsqlDataSource dataSource)
{
    public Task<IReadOnlyList<EquipmentDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        return dataSource.QueryAsync(
            "SELECT id, name, cost_per_day, cost_half_day, place_to_rent_from FROM equipment WHERE deleted_at IS NULL ORDER BY name",
            reader => new EquipmentDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetDecimal(2),
                reader.GetDecimal(3),
                reader.IsDBNull(4) ? "" : reader.GetString(4)),
            cancellationToken: cancellationToken);
    }

    public Task<EquipmentDto?> CreateAsync(EquipmentBody body, CancellationToken cancellationToken = default)
    {
        return dataSource.QuerySingleOrDefaultAsync(
            """
            INSERT INTO equipment (name, cost_per_day, cost_half_day, place_to_rent_from)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, cost_per_day, cost_half_day, place_to_rent_from
            """,
            reader => new EquipmentDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetDecimal(2),
                reader.GetDecimal(3),
                reader.IsDBNull(4) ? "" : reader.GetString(4)),
            p =>
            {
                p.AddWithValue(body.Name);
                p.AddWithValue(body.CostPerDay);
                p.AddWithValue(body.CostHalfDay);
                p.AddWithValue(body.PlaceToRentFrom);
            },
            isWrite: true,
            cancellationToken);
    }

    public Task<EquipmentDto?> UpdateAsync(Guid id, EquipmentBody body, CancellationToken cancellationToken = default)
    {
        return dataSource.QuerySingleOrDefaultAsync(
            """
            UPDATE equipment SET name = $2, cost_per_day = $3, cost_half_day = $4, place_to_rent_from = $5, updated_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, name, cost_per_day, cost_half_day, place_to_rent_from
            """,
            reader => new EquipmentDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetDecimal(2),
                reader.GetDecimal(3),
                reader.IsDBNull(4) ? "" : reader.GetString(4)),
            p =>
            {
                p.AddWithValue(id);
                p.AddWithValue(body.Name);
                p.AddWithValue(body.CostPerDay);
                p.AddWithValue(body.CostHalfDay);
                p.AddWithValue(body.PlaceToRentFrom);
            },
            isWrite: true,
            cancellationToken);
    }

    public async Task<bool> SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await dataSource.ExecuteNonQueryAsync(
            "UPDATE equipment SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
            p => p.AddWithValue(id),
            cancellationToken) > 0;
    }
}
