using Npgsql;

public class ProjectRepository(NpgsqlDataSource dataSource)
{
    public async Task<IReadOnlyList<ProjectDto>> ListForKeycloakSubAsync(string sub, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT p.id, p.name, p.address, p.created_at, p.updated_at
            FROM project p
            JOIN "user" u ON u.company_id = p.company_id
            WHERE u.keycloak_sub = $1 AND p.deleted_at IS NULL
            ORDER BY p.created_at
            """;
        cmd.Parameters.AddWithValue(sub);

        var projects = new List<ProjectDto>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            projects.Add(new ProjectDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetDateTime(3),
                reader.GetDateTime(4)));
        }

        return projects;
    }

    public async Task<Guid?> GetCompanyIdForKeycloakSubAsync(string sub, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """SELECT company_id FROM "user" WHERE keycloak_sub = $1""";
        cmd.Parameters.AddWithValue(sub);
        return await cmd.ExecuteScalarAsync(cancellationToken) as Guid?;
    }

    public async Task<ProjectDto?> CreateAsync(Guid companyId, ProjectBody body, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO project (company_id, name, address)
            VALUES ($1, $2, $3)
            RETURNING id, name, address, created_at, updated_at
            """;
        cmd.Parameters.AddWithValue(companyId);
        cmd.Parameters.AddWithValue(body.Name);
        cmd.Parameters.AddWithValue(body.Address);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return null;
        return new ProjectDto(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetDateTime(3),
            reader.GetDateTime(4));
    }

    public async Task<ProjectDto?> UpdateAsync(Guid id, ProjectBody body, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE project SET name = $2, address = $3, updated_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, name, address, created_at, updated_at
            """;
        cmd.Parameters.AddWithValue(id);
        cmd.Parameters.AddWithValue(body.Name);
        cmd.Parameters.AddWithValue(body.Address);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return null;
        return new ProjectDto(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetDateTime(3),
            reader.GetDateTime(4));
    }

    public async Task<bool> SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE project SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL";
        cmd.Parameters.AddWithValue(id);
        return await cmd.ExecuteNonQueryAsync(cancellationToken) > 0;
    }
}
