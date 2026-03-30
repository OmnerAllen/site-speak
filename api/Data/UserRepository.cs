using Npgsql;

public class UserRepository(NpgsqlDataSource dataSource)
{
    public async Task<UserMeResponse?> GetMeAsync(string sub, string email, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);

        Guid userId;
        Guid? employeeId = null;
        Guid? companyId = null;

        var existing = await conn.QuerySingleOrDefaultAsync(
            """SELECT id, employee_id, company_id FROM "user" WHERE keycloak_sub = $1""",
            reader => new UserLookupRow(
                reader.GetGuid(0),
                reader.IsDBNull(1) ? null : reader.GetGuid(1),
                reader.IsDBNull(2) ? null : reader.GetGuid(2)),
            configureParameters: p => p.AddWithValue(sub),
            cancellationToken: cancellationToken);

        if (existing is not null)
        {
            userId = existing.Id;
            employeeId = existing.EmployeeId;
            companyId = existing.CompanyId;
        }
        else
        {
            var inserted = await conn.QuerySingleOrDefaultAsync(
                """
                INSERT INTO "user" (keycloak_sub, email, company_id)
                VALUES ($1, $2, (SELECT id FROM company WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1))
                ON CONFLICT (keycloak_sub) DO UPDATE SET email = EXCLUDED.email
                RETURNING id, company_id
                """,
                reader => new InsertedUserRow(
                    reader.GetGuid(0),
                    reader.IsDBNull(1) ? null : reader.GetGuid(1)),
                configureParameters: p =>
                {
                    p.AddWithValue(sub);
                    p.AddWithValue(email);
                },
                isWrite: true,
                cancellationToken: cancellationToken);

            if (inserted is null)
                return null;

            userId = inserted.Id;
            companyId = inserted.CompanyId;
        }

        string? companyName = null;
        if (companyId is not null)
        {
            companyName = await conn.ExecuteScalarAsync<string>(
                "SELECT name FROM company WHERE id = $1",
                configureParameters: p => p.AddWithValue(companyId.Value),
                cancellationToken: cancellationToken);
        }

        var roles = await conn.QueryAsync(
            """
            SELECT r.name FROM role r
            JOIN user_role ur ON ur.role_id = r.id
            WHERE ur.user_id = $1
            """,
            reader => reader.GetString(0),
            configureParameters: p => p.AddWithValue(userId),
            cancellationToken: cancellationToken);

        var permissions = await conn.QueryAsync(
            """
            SELECT DISTINCT p.name FROM permission p
            JOIN role_permission rp ON rp.permission_id = p.id
            JOIN user_role ur ON ur.role_id = rp.role_id
            WHERE ur.user_id = $1
            """,
            reader => reader.GetString(0),
            configureParameters: p => p.AddWithValue(userId),
            cancellationToken: cancellationToken);

        return new UserMeResponse(
            userId,
            sub,
            email,
            employeeId,
            companyId,
            companyName,
            roles,
            permissions);
    }

    public Task<IReadOnlyList<(string CompanyId, long Count)>> GetUserCountsByCompanyAsync(
        CancellationToken cancellationToken = default)
    {
        return dataSource.QueryAsync(
            """
            SELECT company_id::text, COUNT(*)::bigint
            FROM "user"
            WHERE company_id IS NOT NULL
            GROUP BY company_id
            """,
            reader => (reader.GetString(0), reader.GetInt64(1)),
            cancellationToken: cancellationToken);
    }

    public Task<IReadOnlyList<string>> GetRoleNamesForKeycloakSubAsync(string sub, CancellationToken cancellationToken = default)
    {
        return dataSource.QueryAsync(
            """
            SELECT r.name FROM role r
            JOIN user_role ur ON ur.role_id = r.id
            JOIN "user" u ON u.id = ur.user_id
            WHERE u.keycloak_sub = $1
            """,
            reader => reader.GetString(0),
            p => p.AddWithValue(sub),
            cancellationToken: cancellationToken);
    }

    private sealed record UserLookupRow(Guid Id, Guid? EmployeeId, Guid? CompanyId);

    private sealed record InsertedUserRow(Guid Id, Guid? CompanyId);
}
