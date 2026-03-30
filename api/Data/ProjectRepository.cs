using Npgsql;

public class ProjectRepository(NpgsqlDataSource dataSource)
{
    public Task<IReadOnlyList<ProjectDto>> ListForCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return dataSource.QueryAsync(
            """
            SELECT p.id, p.name, p.address, p.overview, p.created_at, p.updated_at
            FROM project p
            WHERE p.company_id = $1 AND p.deleted_at IS NULL
            ORDER BY p.created_at
            """,
            reader => new ProjectDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetDateTime(4),
                reader.GetDateTime(5)),
            p => p.AddWithValue(companyId),
            cancellationToken: cancellationToken);
    }

    public async Task<Guid?> GetCompanyIdForKeycloakSubAsync(string sub, CancellationToken cancellationToken = default)
    {
        return await dataSource.ExecuteScalarAsync<Guid>(
            """SELECT company_id FROM "user" WHERE keycloak_sub = $1""",
            p => p.AddWithValue(sub),
            cancellationToken: cancellationToken);
    }

    public async Task<ProjectDto?> CreateAsync(Guid companyId, ProjectBody body, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        var dto = await conn.QuerySingleOrDefaultAsync(
            """
            INSERT INTO project (company_id, name, address, overview)
            VALUES ($1, $2, $3, COALESCE($4, ''))
            RETURNING id, name, address, overview, created_at, updated_at
            """,
            reader => new ProjectDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetDateTime(4),
                reader.GetDateTime(5)),
            tx,
            p =>
            {
                p.AddWithValue(companyId);
                p.AddWithValue(body.Name);
                p.AddWithValue(body.Address);
                p.AddWithValue((object?)body.Overview ?? DBNull.Value);
            },
            isWrite: true,
            cancellationToken: cancellationToken);

        if (dto is null)
        {
            await tx.RollbackAsync(cancellationToken);
            return null;
        }

        await EnsureProjectStagesAsync(conn, dto.Id, tx, cancellationToken);
        await tx.CommitAsync(cancellationToken);
        return dto;
    }

    public Task<ProjectDto?> UpdateAsync(Guid id, Guid companyId, ProjectBody body, CancellationToken cancellationToken = default)
    {
        return dataSource.QuerySingleOrDefaultAsync(
            """
            UPDATE project
            SET name = $2, address = $3, overview = COALESCE($4, overview), updated_at = NOW()
            WHERE id = $1 AND company_id = $5 AND deleted_at IS NULL
            RETURNING id, name, address, overview, created_at, updated_at
            """,
            reader => new ProjectDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetDateTime(4),
                reader.GetDateTime(5)),
            p =>
            {
                p.AddWithValue(id);
                p.AddWithValue(body.Name);
                p.AddWithValue(body.Address);
                p.AddWithValue((object?)body.Overview ?? DBNull.Value);
                p.AddWithValue(companyId);
            },
            isWrite: true,
            cancellationToken: cancellationToken);
    }

    public async Task<bool> SoftDeleteAsync(Guid id, Guid companyId, CancellationToken cancellationToken = default)
    {
        return await dataSource.ExecuteNonQueryAsync(
            "UPDATE project SET deleted_at = NOW() WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL",
            p =>
            {
                p.AddWithValue(id);
                p.AddWithValue(companyId);
            },
            cancellationToken) > 0;
    }

    public async Task<ProjectDetailsResponse?> GetDetailsAsync(Guid projectId, Guid companyId, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);

        var project = await conn.QuerySingleOrDefaultAsync(
            """
            SELECT id, name, address, overview, created_at, updated_at
            FROM project
            WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
            """,
            reader => new ProjectDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetDateTime(4),
                reader.GetDateTime(5)),
            configureParameters: p =>
            {
                p.AddWithValue(projectId);
                p.AddWithValue(companyId);
            },
            cancellationToken: cancellationToken);

        if (project is null) return null;

        await EnsureProjectStagesAsync(conn, projectId, null, cancellationToken);

        var stages = await conn.QueryAsync(
            """
            SELECT id, name, details, notes, created_at, updated_at
            FROM stage
            WHERE project_id = $1 AND deleted_at IS NULL
            ORDER BY CASE name
                WHEN 'demo' THEN 1
                WHEN 'prep' THEN 2
                WHEN 'build/install' THEN 3
                WHEN 'qa' THEN 4
                ELSE 99
            END,
            created_at
            """,
            reader => new StageDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetDateTime(4),
                reader.GetDateTime(5)),
            configureParameters: p => p.AddWithValue(projectId),
            cancellationToken: cancellationToken);

        return new ProjectDetailsResponse(
            project.Id,
            project.Name,
            project.Address,
            project.Overview,
            project.CreatedAt,
            project.UpdatedAt,
            stages);
    }

    public async Task<ProjectDetailsUpdateResult> UpdateDetailsAsync(
        Guid projectId,
        Guid companyId,
        ProjectDetailsBody body,
        CancellationToken cancellationToken = default)
    {
        var allowedStageNames = new HashSet<string>(StringComparer.Ordinal)
        {
            "demo",
            "prep",
            "build/install",
            "qa"
        };

        if (body.Stages is null)
            return ProjectDetailsUpdateResult.StagesRequired;

        if (body.Stages.Any(s => !allowedStageNames.Contains(s.Name)))
            return ProjectDetailsUpdateResult.InvalidStage;

        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        var projectRows = await conn.ExecuteNonQueryAsync(
            """
            UPDATE project
            SET name = $2, address = $3, overview = COALESCE($4, ''), updated_at = NOW()
            WHERE id = $1 AND company_id = $5 AND deleted_at IS NULL
            """,
            tx,
            p =>
            {
                p.AddWithValue(projectId);
                p.AddWithValue(body.Name);
                p.AddWithValue(body.Address);
                p.AddWithValue((object?)body.Overview ?? DBNull.Value);
                p.AddWithValue(companyId);
            },
            cancellationToken: cancellationToken);

        if (projectRows == 0)
        {
            await tx.RollbackAsync(cancellationToken);
            return ProjectDetailsUpdateResult.NotFound;
        }

        await EnsureProjectStagesAsync(conn, projectId, tx, cancellationToken);

        foreach (var stage in body.Stages.DistinctBy(s => s.Name))
        {
            await conn.ExecuteNonQueryAsync(
                """
                UPDATE stage
                SET details = $3, notes = $4, updated_at = NOW()
                WHERE project_id = $1 AND name = $2 AND deleted_at IS NULL
                """,
                tx,
                p =>
                {
                    p.AddWithValue(projectId);
                    p.AddWithValue(stage.Name);
                    p.AddWithValue((object?)stage.Details ?? string.Empty);
                    p.AddWithValue((object?)stage.Notes ?? string.Empty);
                },
                cancellationToken: cancellationToken);
        }

        await tx.CommitAsync(cancellationToken);
        return ProjectDetailsUpdateResult.Ok;
    }

    private static Task EnsureProjectStagesAsync(
        NpgsqlConnection conn,
        Guid projectId,
        NpgsqlTransaction? tx,
        CancellationToken cancellationToken)
    {
        return conn.ExecuteNonQueryAsync(
            """
            INSERT INTO stage (project_id, name)
            SELECT $1, required.name
            FROM (VALUES ('demo'), ('prep'), ('build/install'), ('qa')) AS required(name)
            WHERE NOT EXISTS (
                SELECT 1
                FROM stage s
                WHERE s.project_id = $1
                  AND s.name = required.name
                  AND s.deleted_at IS NULL
            )
            """,
            tx,
            p => p.AddWithValue(projectId),
            cancellationToken: cancellationToken);
    }
}
