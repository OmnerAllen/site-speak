using Npgsql;

public class EquipmentRepository(NpgsqlDataSource dataSource)
{
    private static EquipmentDto ReadEquipmentDto(NpgsqlDataReader reader) =>
        new(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetDecimal(2),
            reader.GetDecimal(3),
            reader.IsDBNull(4) ? null : reader.GetGuid(4),
            reader.GetString(5),
            reader.IsDBNull(6) ? null : reader.GetDouble(6),
            reader.IsDBNull(7) ? null : reader.GetDouble(7));

    private const string EquipmentJoinSql = """
        SELECT e.id, e.name, e.cost_per_day, e.cost_half_day, e.rental_supplier_id,
               COALESCE(s.name, ''), s.latitude, s.longitude
        FROM equipment e
        LEFT JOIN supplier s ON s.id = e.rental_supplier_id AND s.deleted_at IS NULL
        """;

    public Task<IReadOnlyList<EquipmentDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        return dataSource.QueryAsync(
            EquipmentJoinSql + " WHERE e.deleted_at IS NULL ORDER BY e.name",
            ReadEquipmentDto,
            cancellationToken: cancellationToken);
    }

    public async Task<EquipmentDto?> CreateAsync(EquipmentBody body, CancellationToken cancellationToken = default)
    {
        var id = await dataSource.QuerySingleOrDefaultAsync(
            """
            INSERT INTO equipment (name, cost_per_day, cost_half_day, rental_supplier_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            """,
            reader => reader.GetGuid(0),
            p =>
            {
                p.AddWithValue(body.Name);
                p.AddWithValue(body.CostPerDay);
                p.AddWithValue(body.CostHalfDay);
                p.AddWithValue(body.RentalSupplierId);
            },
            isWrite: true,
            cancellationToken);

        if (id == Guid.Empty) return null;

        return await dataSource.QuerySingleOrDefaultAsync(
            EquipmentJoinSql + " WHERE e.id = $1 AND e.deleted_at IS NULL",
            ReadEquipmentDto,
            p => p.AddWithValue(id),
            cancellationToken: cancellationToken);
    }

    public async Task<EquipmentDto?> UpdateAsync(Guid id, EquipmentBody body, CancellationToken cancellationToken = default)
    {
        var rows = await dataSource.ExecuteNonQueryAsync(
            """
            UPDATE equipment SET name = $2, cost_per_day = $3, cost_half_day = $4, rental_supplier_id = $5, updated_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
            """,
            p =>
            {
                p.AddWithValue(id);
                p.AddWithValue(body.Name);
                p.AddWithValue(body.CostPerDay);
                p.AddWithValue(body.CostHalfDay);
                p.AddWithValue(body.RentalSupplierId);
            },
            cancellationToken);

        if (rows == 0) return null;

        return await dataSource.QuerySingleOrDefaultAsync(
            EquipmentJoinSql + " WHERE e.id = $1 AND e.deleted_at IS NULL",
            ReadEquipmentDto,
            p => p.AddWithValue(id),
            cancellationToken: cancellationToken);
    }

    public async Task<bool> SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await dataSource.ExecuteNonQueryAsync(
            "UPDATE equipment SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
            p => p.AddWithValue(id),
            cancellationToken) > 0;
    }
}
