using Npgsql;
using SiteSpeak.Logic;

public class WorkLogRepository(NpgsqlDataSource dataSource)
{
    public Task<IReadOnlyList<WorkLogListItemDto>> ListForCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return dataSource.QueryAsync(
            """
            SELECT wl.id, wl.employee_id, wl.project_id, e.name, p.name, wl.started_at, wl.ended_at, wl.notes
            FROM work_log wl
            JOIN employee e ON e.id = wl.employee_id AND e.company_id = $1 AND e.deleted_at IS NULL
            JOIN project p ON p.id = wl.project_id AND p.company_id = $1 AND p.deleted_at IS NULL
            WHERE wl.deleted_at IS NULL
            ORDER BY wl.started_at DESC
            """,
            reader => new WorkLogListItemDto(
                reader.GetGuid(0),
                reader.GetGuid(1),
                reader.GetGuid(2),
                reader.GetString(3),
                reader.GetString(4),
                reader.GetDateTime(5),
                reader.GetDateTime(6),
                reader.IsDBNull(7) ? null : reader.GetString(7)),
            p => p.AddWithValue(companyId),
            cancellationToken: cancellationToken);
    }

    public async Task<WorkLogListItemDto?> CreateAsync(Guid companyId, WorkLogBody body, CancellationToken cancellationToken = default)
    {
        if (!WorkLogTimeRange.IsValid(body.StartedAt, body.EndedAt))
            return null;

        var valid = await dataSource.ExecuteScalarAsync<bool>(
            """
            SELECT EXISTS(
                SELECT 1 FROM employee WHERE id = $1 AND company_id = $3 AND deleted_at IS NULL
            ) AND EXISTS(
                SELECT 1 FROM project WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
            )
            """,
            p =>
            {
                p.AddWithValue(body.EmployeeId);
                p.AddWithValue(body.ProjectId);
                p.AddWithValue(companyId);
            },
            cancellationToken: cancellationToken);

        if (!valid)
            return null;

        var newId = await dataSource.ExecuteScalarAsync<Guid>(
            """
            INSERT INTO work_log (employee_id, project_id, started_at, ended_at, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            """,
            p =>
            {
                p.AddWithValue(body.EmployeeId);
                p.AddWithValue(body.ProjectId);
                p.AddWithValue(body.StartedAt);
                p.AddWithValue(body.EndedAt);
                p.AddWithValue((object?)body.Notes ?? DBNull.Value);
            },
            isWrite: true,
            cancellationToken: cancellationToken);

        return await GetByIdAsync(newId, companyId, cancellationToken);
    }

    public async Task<WorkLogListItemDto?> UpdateAsync(Guid id, Guid companyId, WorkLogBody body, CancellationToken cancellationToken = default)
    {
        if (!WorkLogTimeRange.IsValid(body.StartedAt, body.EndedAt))
            return null;

        var valid = await dataSource.ExecuteScalarAsync<bool>(
            """
            SELECT EXISTS(
                SELECT 1 FROM employee WHERE id = $1 AND company_id = $3 AND deleted_at IS NULL
            ) AND EXISTS(
                SELECT 1 FROM project WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
            )
            """,
            p =>
            {
                p.AddWithValue(body.EmployeeId);
                p.AddWithValue(body.ProjectId);
                p.AddWithValue(companyId);
            },
            cancellationToken: cancellationToken);

        if (!valid)
            return null;

        var rows = await dataSource.ExecuteNonQueryAsync(
            """
            UPDATE work_log wl
            SET employee_id = $2, project_id = $3, started_at = $4, ended_at = $5, notes = $6, updated_at = NOW()
            WHERE wl.id = $1 AND wl.deleted_at IS NULL
              AND EXISTS (SELECT 1 FROM employee e WHERE e.id = $2 AND e.company_id = $7 AND e.deleted_at IS NULL)
              AND EXISTS (SELECT 1 FROM project p WHERE p.id = $3 AND p.company_id = $7 AND p.deleted_at IS NULL)
              AND EXISTS (
                  SELECT 1 FROM employee e2
                  JOIN work_log wl2 ON wl2.employee_id = e2.id
                  WHERE wl2.id = $1 AND e2.company_id = $7 AND e2.deleted_at IS NULL
              )
            """,
            p =>
            {
                p.AddWithValue(id);
                p.AddWithValue(body.EmployeeId);
                p.AddWithValue(body.ProjectId);
                p.AddWithValue(body.StartedAt);
                p.AddWithValue(body.EndedAt);
                p.AddWithValue((object?)body.Notes ?? DBNull.Value);
                p.AddWithValue(companyId);
            },
            cancellationToken: cancellationToken);

        return rows > 0 ? await GetByIdAsync(id, companyId, cancellationToken) : null;
    }

    public async Task<bool> SoftDeleteAsync(Guid id, Guid companyId, CancellationToken cancellationToken = default)
    {
        return await dataSource.ExecuteNonQueryAsync(
            """
            UPDATE work_log wl
            SET deleted_at = NOW()
            WHERE wl.id = $1 AND wl.deleted_at IS NULL
              AND EXISTS (
                  SELECT 1 FROM employee e
                  WHERE e.id = wl.employee_id AND e.company_id = $2 AND e.deleted_at IS NULL
              )
            """,
            p =>
            {
                p.AddWithValue(id);
                p.AddWithValue(companyId);
            },
            cancellationToken) > 0;
    }

    private Task<WorkLogListItemDto?> GetByIdAsync(Guid id, Guid companyId, CancellationToken cancellationToken = default)
    {
        return dataSource.QuerySingleOrDefaultAsync(
            """
            SELECT wl.id, wl.employee_id, wl.project_id, e.name, p.name, wl.started_at, wl.ended_at, wl.notes
            FROM work_log wl
            JOIN employee e ON e.id = wl.employee_id AND e.company_id = $2 AND e.deleted_at IS NULL
            JOIN project p ON p.id = wl.project_id AND p.company_id = $2 AND p.deleted_at IS NULL
            WHERE wl.id = $1 AND wl.deleted_at IS NULL
            """,
            reader => new WorkLogListItemDto(
                reader.GetGuid(0),
                reader.GetGuid(1),
                reader.GetGuid(2),
                reader.GetString(3),
                reader.GetString(4),
                reader.GetDateTime(5),
                reader.GetDateTime(6),
                reader.IsDBNull(7) ? null : reader.GetString(7)),
            p =>
            {
                p.AddWithValue(id);
                p.AddWithValue(companyId);
            },
            cancellationToken: cancellationToken);
    }
}
