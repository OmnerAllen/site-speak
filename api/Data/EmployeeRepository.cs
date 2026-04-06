using Npgsql;
using SiteSpeak.Logic;

public class EmployeeRepository(NpgsqlDataSource dataSource)
{

    public Task<IReadOnlyList<EmployeeDto>> ListForCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return dataSource.QueryAsync(
            """
            SELECT id, name, type FROM employee
            WHERE company_id = $1 AND deleted_at IS NULL
            ORDER BY name
            """,
            reader => new EmployeeDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2)),
            p => p.AddWithValue(companyId),
            cancellationToken: cancellationToken);
    }

    public Task<EmployeeDto?> CreateAsync(Guid companyId, EmployeeBody body, CancellationToken cancellationToken = default)
    {
        if (!EmployeeTypeRules.IsAllowed(body.Type))
            return Task.FromResult<EmployeeDto?>(null);

        return dataSource.QuerySingleOrDefaultAsync(
            """
            INSERT INTO employee (company_id, name, type)
            VALUES ($1, $2, $3)
            RETURNING id, name, type
            """,
            reader => new EmployeeDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2)),
            p =>
            {
                p.AddWithValue(companyId);
                p.AddWithValue(body.Name);
                p.AddWithValue(body.Type);
            },
            isWrite: true,
            cancellationToken: cancellationToken);
    }

    public Task<EmployeeDto?> UpdateAsync(Guid id, Guid companyId, EmployeeBody body, CancellationToken cancellationToken = default)
    {
        if (!EmployeeTypeRules.IsAllowed(body.Type))
            return Task.FromResult<EmployeeDto?>(null);

        return dataSource.QuerySingleOrDefaultAsync(
            """
            UPDATE employee
            SET name = $2, type = $3, updated_at = NOW()
            WHERE id = $1 AND company_id = $4 AND deleted_at IS NULL
            RETURNING id, name, type
            """,
            reader => new EmployeeDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2)),
            p =>
            {
                p.AddWithValue(id);
                p.AddWithValue(body.Name);
                p.AddWithValue(body.Type);
                p.AddWithValue(companyId);
            },
            isWrite: true,
            cancellationToken: cancellationToken);
    }

    public async Task<bool> SoftDeleteAsync(Guid id, Guid companyId, CancellationToken cancellationToken = default)
    {
        return await dataSource.ExecuteNonQueryAsync(
            "UPDATE employee SET deleted_at = NOW() WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL",
            p =>
            {
                p.AddWithValue(id);
                p.AddWithValue(companyId);
            },
            cancellationToken) > 0;
    }
}
