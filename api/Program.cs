var builder = WebApplication.CreateBuilder(args);

builder.AddSiteSpeakTelemetry();
builder.AddSiteSpeakDatabase();
builder.AddSiteSpeakData();
builder.AddSiteSpeakAuth();

var app = builder.Build();

app.UseSiteSpeakAuth();

app.MapSiteSpeakEndpoints();

app.MapGet("/my/projects/{id:guid}/details", async (Guid id, ClaimsPrincipal user, NpgsqlDataSource db) =>
{
    var sub = user.FindFirstValue("sub");
    if (sub is null) return Results.Unauthorized();

    await using var conn = await db.OpenConnectionAsync();
    var companyId = await GetCompanyIdFromSub(conn, sub);
    if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

    await using var projectCmd = conn.CreateCommand();
    projectCmd.CommandText = """
        SELECT id, name, address, overview, created_at, updated_at
        FROM project
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
        """;
    projectCmd.Parameters.AddWithValue(id);
    projectCmd.Parameters.AddWithValue(companyId.Value);

    await using var projectReader = await projectCmd.ExecuteReaderAsync();
    if (!await projectReader.ReadAsync()) return Results.NotFound();

    var project = new
    {
        id = projectReader.GetGuid(0),
        name = projectReader.GetString(1),
        address = projectReader.GetString(2),
        overview = projectReader.GetString(3),
        createdAt = projectReader.GetDateTime(4),
        updatedAt = projectReader.GetDateTime(5)
    };
    await projectReader.CloseAsync();

    await EnsureProjectStages(conn, id);

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
    stagesCmd.Parameters.AddWithValue(id);

    var stages = new List<object>();
    await using var stageReader = await stagesCmd.ExecuteReaderAsync();
    while (await stageReader.ReadAsync())
    {
        stages.Add(new
        {
            id = stageReader.GetGuid(0),
            name = stageReader.GetString(1),
            details = stageReader.GetString(2),
            notes = stageReader.GetString(3),
            createdAt = stageReader.GetDateTime(4),
            updatedAt = stageReader.GetDateTime(5)
        });
    }

    return Results.Ok(new
    {
        project.id,
        project.name,
        project.address,
        project.overview,
        project.createdAt,
        project.updatedAt,
        stages
    });
}).RequireAuthorization();

app.MapPut("/my/projects/{id:guid}/details", async (Guid id, ClaimsPrincipal user, ProjectDetailsBody body, NpgsqlDataSource db) =>
{
    var sub = user.FindFirstValue("sub");
    if (sub is null) return Results.Unauthorized();

    await using var conn = await db.OpenConnectionAsync();
    var companyId = await GetCompanyIdFromSub(conn, sub);
    if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

    var allowedStageNames = new HashSet<string>(StringComparer.Ordinal)
    {
        "demo",
        "prep",
        "build/install",
        "qa"
    };

    if (body.Stages is null)
        return Results.BadRequest(new { error = "Stages payload is required" });

    if (body.Stages.Any(s => !allowedStageNames.Contains(s.Name)))
        return Results.BadRequest(new { error = "Invalid stage name in payload" });

    await using var tx = await conn.BeginTransactionAsync();

    await using (var projectCmd = conn.CreateCommand())
    {
        projectCmd.Transaction = tx;
        projectCmd.CommandText = """
            UPDATE project
            SET name = $2, address = $3, overview = COALESCE($4, ''), updated_at = NOW()
            WHERE id = $1 AND company_id = $5 AND deleted_at IS NULL
            """;
        projectCmd.Parameters.AddWithValue(id);
        projectCmd.Parameters.AddWithValue(body.Name);
        projectCmd.Parameters.AddWithValue(body.Address);
        projectCmd.Parameters.AddWithValue((object?)body.Overview ?? DBNull.Value);
        projectCmd.Parameters.AddWithValue(companyId.Value);

        if (await projectCmd.ExecuteNonQueryAsync() == 0)
        {
            await tx.RollbackAsync();
            return Results.NotFound();
        }
    }

    await EnsureProjectStages(conn, id, tx);

    foreach (var stage in body.Stages.DistinctBy(s => s.Name))
    {
        await using var stageCmd = conn.CreateCommand();
        stageCmd.Transaction = tx;
        stageCmd.CommandText = """
            UPDATE stage
            SET details = $3, notes = $4, updated_at = NOW()
            WHERE project_id = $1 AND name = $2 AND deleted_at IS NULL
            """;
        stageCmd.Parameters.AddWithValue(id);
        stageCmd.Parameters.AddWithValue(stage.Name);
        stageCmd.Parameters.AddWithValue((object?)stage.Details ?? string.Empty);
        stageCmd.Parameters.AddWithValue((object?)stage.Notes ?? string.Empty);
        await stageCmd.ExecuteNonQueryAsync();
    }

    await tx.CommitAsync();
    return Results.NoContent();
}).RequireAuthorization();

app.Run();

// ── Helpers & DTOs ───────────────────────────────────────────────────────

static async Task<Guid?> LookupSupplier(NpgsqlConnection conn, string? name)
{
    if (string.IsNullOrWhiteSpace(name)) return null;

    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT id FROM supplier WHERE name = $1 AND deleted_at IS NULL LIMIT 1";
    cmd.Parameters.AddWithValue(name);
    var result = await cmd.ExecuteScalarAsync();
    return result as Guid?;
}

static async Task<Guid?> GetCompanyIdFromSub(NpgsqlConnection conn, string sub)
{
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = """SELECT company_id FROM "user" WHERE keycloak_sub = $1""";
    cmd.Parameters.AddWithValue(sub);
    return await cmd.ExecuteScalarAsync() as Guid?;
}

static async Task EnsureProjectStages(NpgsqlConnection conn, Guid projectId, NpgsqlTransaction? tx = null)
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
    await cmd.ExecuteNonQueryAsync();
}

record SupplierBody(string Name, string Address, string? Phone);
record EquipmentBody(string Name, decimal CostPerDay, decimal CostHalfDay, string PlaceToRentFrom);
record MaterialBody(string ProductName, string? SupplierName, string Unit, string ProductType, decimal PricePerUnit, string Currency);
record ProjectBody(string Name, string Address, string? Overview = null);
record StageDetailsBody(string Name, string? Details, string? Notes);
record ProjectDetailsBody(string Name, string Address, string? Overview, List<StageDetailsBody> Stages);
