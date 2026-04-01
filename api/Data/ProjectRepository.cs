using Npgsql;

public class ProjectRepository(NpgsqlDataSource dataSource)
{
    private static string? ReadDateColumn(NpgsqlDataReader reader, int ordinal) =>
        reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal).ToString("yyyy-MM-dd");

    private static object DbDateParam(string? isoDate)
    {
        if (string.IsNullOrWhiteSpace(isoDate)) return DBNull.Value;
        return DateOnly.TryParse(isoDate, out var d) ? d.ToDateTime(TimeOnly.MinValue) : DBNull.Value;
    }

    private static ProjectDto ReadProjectDto(NpgsqlDataReader reader) =>
        new(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetString(3),
            reader.GetDateTime(4),
            reader.GetDateTime(5),
            ReadDateColumn(reader, 6),
            ReadDateColumn(reader, 7));

    private const string ProjectDtoSelectDerived = """
        p.id, p.name, p.address, p.overview, p.created_at, p.updated_at,
          (SELECT MIN(s.planned_start) FROM stage s WHERE s.project_id = p.id AND s.deleted_at IS NULL),
          (SELECT MAX(s.planned_end) FROM stage s WHERE s.project_id = p.id AND s.deleted_at IS NULL)
        """;

    private const string ProjectDtoInsertReturningDerived = """
        p.id, p.name, p.address, p.overview, p.created_at, p.updated_at,
          (SELECT MIN(s.planned_start) FROM stage s WHERE s.project_id = p.id AND s.deleted_at IS NULL),
          (SELECT MAX(s.planned_end) FROM stage s WHERE s.project_id = p.id AND s.deleted_at IS NULL)
        """;

    public Task<IReadOnlyList<ProjectDto>> ListForCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return dataSource.QueryAsync(
            $"""
            SELECT {ProjectDtoSelectDerived}
            FROM project p
            WHERE p.company_id = $1 AND p.deleted_at IS NULL
            ORDER BY p.created_at
            """,
            ReadProjectDto,
            p => p.AddWithValue(companyId),
            cancellationToken: cancellationToken);
    }

    public async Task<IReadOnlyList<ScheduleProjectDto>> ListScheduleForCompanyAsync(
        Guid companyId,
        CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);

        var projectRows = await conn.QueryAsync(
            """
            SELECT p.id, p.name, p.address,
              (SELECT MIN(s.planned_start) FROM stage s WHERE s.project_id = p.id AND s.deleted_at IS NULL),
              (SELECT MAX(s.planned_end) FROM stage s WHERE s.project_id = p.id AND s.deleted_at IS NULL)
            FROM project p
            WHERE p.company_id = $1 AND p.deleted_at IS NULL
            ORDER BY p.created_at
            """,
            reader => new
            {
                Id = reader.GetGuid(0),
                Name = reader.GetString(1),
                Address = reader.GetString(2),
                PlannedStart = ReadDateColumn(reader, 3),
                PlannedEnd = ReadDateColumn(reader, 4),
            },
            transaction: null,
            configureParameters: p => p.AddWithValue(companyId),
            cancellationToken: cancellationToken);

        var list = projectRows.ToList();
        if (list.Count == 0)
            return Array.Empty<ScheduleProjectDto>();

        var stages = await conn.QueryAsync(
            """
            SELECT s.id, s.project_id, s.name, s.planned_start, s.planned_end
            FROM stage s
            INNER JOIN project p ON p.id = s.project_id
            WHERE p.company_id = $1 AND p.deleted_at IS NULL AND s.deleted_at IS NULL
            ORDER BY s.project_id,
              CASE s.name
                WHEN 'demo' THEN 1
                WHEN 'prep' THEN 2
                WHEN 'build/install' THEN 3
                WHEN 'qa' THEN 4
                ELSE 99
              END,
              s.created_at
            """,
            reader => new
            {
                Id = reader.GetGuid(0),
                ProjectId = reader.GetGuid(1),
                Name = reader.GetString(2),
                PlannedStart = ReadDateColumn(reader, 3),
                PlannedEnd = ReadDateColumn(reader, 4),
            },
            transaction: null,
            configureParameters: p => p.AddWithValue(companyId),
            cancellationToken: cancellationToken);

        var byProject = stages.GroupBy(s => s.ProjectId).ToDictionary(g => g.Key, g => g.ToList());

        return list.Select(pr =>
        {
            var stageList = byProject.TryGetValue(pr.Id, out var sl)
                ? sl.Select(s => new ScheduleStageDto(s.Id, s.Name, s.PlannedStart, s.PlannedEnd)).ToList()
                : (IReadOnlyList<ScheduleStageDto>)Array.Empty<ScheduleStageDto>();
            return new ScheduleProjectDto(pr.Id, pr.Name, pr.Address, pr.PlannedStart, pr.PlannedEnd, stageList);
        }).ToList();
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
            $"""
            INSERT INTO project AS p (company_id, name, address, overview)
            VALUES ($1, $2, $3, COALESCE($4, ''))
            RETURNING {ProjectDtoInsertReturningDerived}
            """,
            ReadProjectDto,
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
            $"""
            UPDATE project AS p
            SET name = $2, address = $3, overview = COALESCE($4, overview), updated_at = NOW()
            WHERE p.id = $1 AND p.company_id = $5 AND p.deleted_at IS NULL
            RETURNING {ProjectDtoSelectDerived}
            """,
            ReadProjectDto,
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

    public async Task<(SchedulePatchResult Result, ProjectDto? Project)> UpdateScheduleAsync(
        Guid projectId,
        Guid companyId,
        ProjectScheduleBody body,
        CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        var exists = await conn.ExecuteScalarAsync<int>(
            """
            SELECT COUNT(*)::int FROM project p
            WHERE p.id = $1 AND p.company_id = $2 AND p.deleted_at IS NULL
            """,
            tx,
            p =>
            {
                p.AddWithValue(projectId);
                p.AddWithValue(companyId);
            },
            cancellationToken: cancellationToken);

        if (exists == 0)
        {
            await tx.RollbackAsync(cancellationToken);
            return (SchedulePatchResult.ProjectNotFound, null);
        }

        var stageItems = body.Stages ?? Array.Empty<StageScheduleItem>();

        foreach (var item in stageItems)
        {
            var valid = await conn.ExecuteScalarAsync<bool>(
                """
                SELECT EXISTS(
                  SELECT 1 FROM stage s
                  INNER JOIN project p ON p.id = s.project_id
                  WHERE s.id = $1 AND s.project_id = $2 AND p.company_id = $3
                    AND p.deleted_at IS NULL AND s.deleted_at IS NULL)
                """,
                tx,
                p =>
                {
                    p.AddWithValue(item.StageId);
                    p.AddWithValue(projectId);
                    p.AddWithValue(companyId);
                },
                cancellationToken: cancellationToken);

            if (!valid)
            {
                await tx.RollbackAsync(cancellationToken);
                return (SchedulePatchResult.InvalidStage, null);
            }
        }

        foreach (var item in stageItems)
        {
            await conn.ExecuteNonQueryAsync(
                """
                UPDATE stage s
                SET planned_start = $1, planned_end = $2, updated_at = NOW()
                WHERE s.id = $3 AND s.project_id = $4 AND s.deleted_at IS NULL
                """,
                tx,
                p =>
                {
                    p.AddWithValue(DbDateParam(item.PlannedStartDate));
                    p.AddWithValue(DbDateParam(item.PlannedEndDate));
                    p.AddWithValue(item.StageId);
                    p.AddWithValue(projectId);
                },
                cancellationToken: cancellationToken);
        }

        await tx.CommitAsync(cancellationToken);

        var dto = await dataSource.QuerySingleOrDefaultAsync(
            $"""
            SELECT {ProjectDtoSelectDerived}
            FROM project p
            WHERE p.id = $1 AND p.company_id = $2 AND p.deleted_at IS NULL
            """,
            ReadProjectDto,
            p =>
            {
                p.AddWithValue(projectId);
                p.AddWithValue(companyId);
            },
            cancellationToken: cancellationToken);

        return (SchedulePatchResult.Ok, dto);
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
            reader => new
            {
                Id = reader.GetGuid(0),
                Name = reader.GetString(1),
                Address = reader.GetString(2),
                Overview = reader.GetString(3),
                CreatedAt = reader.GetDateTime(4),
                UpdatedAt = reader.GetDateTime(5),
            },
            transaction: null,
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
            SELECT id, name, details, notes, created_at, updated_at, planned_start, planned_end
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
                reader.GetDateTime(5),
                ReadDateColumn(reader, 6),
                ReadDateColumn(reader, 7)),
            transaction: null,
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
