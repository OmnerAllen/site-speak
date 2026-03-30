using Npgsql;

public class UserRepository(NpgsqlDataSource dataSource)
{
    public async Task<UserMeResponse?> GetMeAsync(string sub, string email, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);

        Guid userId;
        Guid? employeeId = null;
        Guid? companyId = null;

        await using (var findCmd = conn.CreateCommand())
        {
            findCmd.CommandText = """SELECT id, employee_id, company_id FROM "user" WHERE keycloak_sub = $1""";
            findCmd.Parameters.AddWithValue(sub);

            await using var reader = await findCmd.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                userId = reader.GetGuid(0);
                employeeId = reader.IsDBNull(1) ? null : reader.GetGuid(1);
                companyId = reader.IsDBNull(2) ? null : reader.GetGuid(2);
            }
            else
            {
                await reader.CloseAsync();

                await using var insertCmd = conn.CreateCommand();
                insertCmd.CommandText = """
                    INSERT INTO "user" (keycloak_sub, email, company_id)
                    VALUES ($1, $2, (SELECT id FROM company WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1))
                    ON CONFLICT (keycloak_sub) DO UPDATE SET email = EXCLUDED.email
                    RETURNING id, company_id
                    """;
                insertCmd.Parameters.AddWithValue(sub);
                insertCmd.Parameters.AddWithValue(email);
                await using var insertReader = await insertCmd.ExecuteReaderAsync(cancellationToken);
                await insertReader.ReadAsync(cancellationToken);
                userId = insertReader.GetGuid(0);
                companyId = insertReader.IsDBNull(1) ? null : insertReader.GetGuid(1);
            }
        }

        string? companyName = null;
        if (companyId is not null)
        {
            await using var compCmd = conn.CreateCommand();
            compCmd.CommandText = "SELECT name FROM company WHERE id = $1";
            compCmd.Parameters.AddWithValue(companyId.Value);
            companyName = (string?)await compCmd.ExecuteScalarAsync(cancellationToken);
        }

        var roles = new List<string>();
        await using (var rolesCmd = conn.CreateCommand())
        {
            rolesCmd.CommandText = """
                SELECT r.name FROM role r
                JOIN user_role ur ON ur.role_id = r.id
                WHERE ur.user_id = $1
                """;
            rolesCmd.Parameters.AddWithValue(userId);
            await using var reader = await rolesCmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                roles.Add(reader.GetString(0));
        }

        var permissions = new List<string>();
        await using (var permsCmd = conn.CreateCommand())
        {
            permsCmd.CommandText = """
                SELECT DISTINCT p.name FROM permission p
                JOIN role_permission rp ON rp.permission_id = p.id
                JOIN user_role ur ON ur.role_id = rp.role_id
                WHERE ur.user_id = $1
                """;
            permsCmd.Parameters.AddWithValue(userId);
            await using var reader = await permsCmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                permissions.Add(reader.GetString(0));
        }

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

    public async Task<IReadOnlyList<string>> GetRoleNamesForKeycloakSubAsync(string sub, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT r.name FROM role r
            JOIN user_role ur ON ur.role_id = r.id
            JOIN "user" u ON u.id = ur.user_id
            WHERE u.keycloak_sub = $1
            """;
        cmd.Parameters.AddWithValue(sub);

        var roles = new List<string>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            roles.Add(reader.GetString(0));

        return roles;
    }
}
