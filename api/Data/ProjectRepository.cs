using Npgsql;

public class ProjectRepository(NpgsqlDataSource dataSource)
{
    public async Task<IReadOnlyList<ProjectDto>> ListForCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT p.id, p.name, p.address, p.overview, p.created_at, p.updated_at
            FROM project p
            WHERE p.company_id = $1 AND p.deleted_at IS NULL
            ORDER BY p.created_at
            """;
        cmd.Parameters.AddWithValue(companyId);

        var projects = new List<ProjectDto>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            projects.Add(new ProjectDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetDateTime(4),
                reader.GetDateTime(5)));
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
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        await using (var cmd = conn.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText = """
                INSERT INTO project (company_id, name, address, overview)
                VALUES ($1, $2, $3, COALESCE($4, ''))
                RETURNING id, name, address, overview, created_at, updated_at
                """;
            cmd.Parameters.AddWithValue(companyId);
            cmd.Parameters.AddWithValue(body.Name);
            cmd.Parameters.AddWithValue(body.Address);
            cmd.Parameters.AddWithValue((object?)body.Overview ?? DBNull.Value);

            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                await tx.RollbackAsync(cancellationToken);
                return null;
            }

            var dto = new ProjectDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetDateTime(4),
                reader.GetDateTime(5));
            await reader.CloseAsync();
            await EnsureProjectStagesAsync(conn, dto.Id, tx, cancellationToken);
            await tx.CommitAsync(cancellationToken);
            return dto;
        }
    }

    public async Task<ProjectDto?> UpdateAsync(Guid id, Guid companyId, ProjectBody body, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE project
            SET name = $2, address = $3, overview = COALESCE($4, overview), updated_at = NOW()
            WHERE id = $1 AND company_id = $5 AND deleted_at IS NULL
            RETURNING id, name, address, overview, created_at, updated_at
            """;
        cmd.Parameters.AddWithValue(id);
        cmd.Parameters.AddWithValue(body.Name);
        cmd.Parameters.AddWithValue(body.Address);
        cmd.Parameters.AddWithValue((object?)body.Overview ?? DBNull.Value);
        cmd.Parameters.AddWithValue(companyId);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return null;
        return new ProjectDto(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetString(3),
            reader.GetDateTime(4),
            reader.GetDateTime(5));
    }

    public async Task<bool> SoftDeleteAsync(Guid id, Guid companyId, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE project SET deleted_at = NOW() WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL";
        cmd.Parameters.AddWithValue(id);
        cmd.Parameters.AddWithValue(companyId);
        return await cmd.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    public async Task<ProjectDetailsResponse?> GetDetailsAsync(Guid projectId, Guid companyId, CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);

        await using (var projectCmd = conn.CreateCommand())
        {
            projectCmd.CommandText = """
                SELECT id, name, address, overview, created_at, updated_at
                FROM project
                WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
                """;
            projectCmd.Parameters.AddWithValue(projectId);
            projectCmd.Parameters.AddWithValue(companyId);

            await using var projectReader = await projectCmd.ExecuteReaderAsync(cancellationToken);
            if (!await projectReader.ReadAsync(cancellationToken)) return null;

            var id = projectReader.GetGuid(0);
            var name = projectReader.GetString(1);
            var address = projectReader.GetString(2);
            var overview = projectReader.GetString(3);
            var createdAt = projectReader.GetDateTime(4);
            var updatedAt = projectReader.GetDateTime(5);
            await projectReader.CloseAsync();

            await EnsureProjectStagesAsync(conn, projectId, null, cancellationToken);

            await using var stagesCmd = conn.CreateCommand();
            stagesCmd.CommandText = """
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
                """;
            stagesCmd.Parameters.AddWithValue(projectId);

            var stages = new List<StageDto>();
            await using var stageReader = await stagesCmd.ExecuteReaderAsync(cancellationToken);
            while (await stageReader.ReadAsync(cancellationToken))
            {
                stages.Add(new StageDto(
                    stageReader.GetGuid(0),
                    stageReader.GetString(1),
                    stageReader.GetString(2),
                    stageReader.GetString(3),
                    stageReader.GetDateTime(4),
                    stageReader.GetDateTime(5)));
            }

            return new ProjectDetailsResponse(id, name, address, overview, createdAt, updatedAt, stages);
        }
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

        await using (var projectCmd = conn.CreateCommand())
        {
            projectCmd.Transaction = tx;
            projectCmd.CommandText = """
                UPDATE project
                SET name = $2, address = $3, overview = COALESCE($4, ''), updated_at = NOW()
                WHERE id = $1 AND company_id = $5 AND deleted_at IS NULL
                """;
            projectCmd.Parameters.AddWithValue(projectId);
            projectCmd.Parameters.AddWithValue(body.Name);
            projectCmd.Parameters.AddWithValue(body.Address);
            projectCmd.Parameters.AddWithValue((object?)body.Overview ?? DBNull.Value);
            projectCmd.Parameters.AddWithValue(companyId);

            if (await projectCmd.ExecuteNonQueryAsync(cancellationToken) == 0)
            {
                await tx.RollbackAsync(cancellationToken);
                return ProjectDetailsUpdateResult.NotFound;
            }
        }

        await EnsureProjectStagesAsync(conn, projectId, tx, cancellationToken);

        foreach (var stage in body.Stages.DistinctBy(s => s.Name))
        {
            await using var stageCmd = conn.CreateCommand();
            stageCmd.Transaction = tx;
            stageCmd.CommandText = """
                UPDATE stage
                SET details = $3, notes = $4, updated_at = NOW()
                WHERE project_id = $1 AND name = $2 AND deleted_at IS NULL
                """;
            stageCmd.Parameters.AddWithValue(projectId);
            stageCmd.Parameters.AddWithValue(stage.Name);
            stageCmd.Parameters.AddWithValue((object?)stage.Details ?? string.Empty);
            stageCmd.Parameters.AddWithValue((object?)stage.Notes ?? string.Empty);
            await stageCmd.ExecuteNonQueryAsync(cancellationToken);
        }

        await tx.CommitAsync(cancellationToken);
        return ProjectDetailsUpdateResult.Ok;
    }

    private static async Task EnsureProjectStagesAsync(
        NpgsqlConnection conn,
        Guid projectId,
        NpgsqlTransaction? tx,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
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
            """;
        cmd.Parameters.AddWithValue(projectId);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }
}
