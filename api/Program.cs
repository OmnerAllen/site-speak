using Npgsql;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Missing ConnectionStrings:DefaultConnection");

var dataSource = NpgsqlDataSource.Create(connectionString);
builder.Services.AddSingleton(dataSource);

var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.MapGet("/health/db", async (NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT 1";
    var result = await cmd.ExecuteScalarAsync();
    return Results.Ok(new { status = "healthy", result });
});

app.MapGet("/companies", async (NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT id, name, address, created_at, updated_at FROM company WHERE deleted_at IS NULL ORDER BY created_at";

    var companies = new List<object>();
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        companies.Add(new
        {
            id = reader.GetGuid(0),
            name = reader.GetString(1),
            address = reader.GetString(2),
            createdAt = reader.GetDateTime(3),
            updatedAt = reader.GetDateTime(4)
        });
    }

    return Results.Ok(companies);
});

app.MapGet("/companies/{id:guid}", async (Guid id, NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT id, name, address, created_at, updated_at FROM company WHERE id = $1 AND deleted_at IS NULL";
    cmd.Parameters.AddWithValue(id);

    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync())
        return Results.NotFound();

    return Results.Ok(new
    {
        id = reader.GetGuid(0),
        name = reader.GetString(1),
        address = reader.GetString(2),
        createdAt = reader.GetDateTime(3),
        updatedAt = reader.GetDateTime(4)
    });
});

app.MapGet("/companies/{id:guid}/projects", async (Guid id, NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();

    await using var check = conn.CreateCommand();
    check.CommandText = "SELECT 1 FROM company WHERE id = $1 AND deleted_at IS NULL";
    check.Parameters.AddWithValue(id);
    if (await check.ExecuteScalarAsync() is null)
        return Results.NotFound();

    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT id, name, address, created_at, updated_at FROM project WHERE company_id = $1 AND deleted_at IS NULL ORDER BY created_at";
    cmd.Parameters.AddWithValue(id);

    var projects = new List<object>();
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        projects.Add(new
        {
            id = reader.GetGuid(0),
            name = reader.GetString(1),
            address = reader.GetString(2),
            createdAt = reader.GetDateTime(3),
            updatedAt = reader.GetDateTime(4)
        });
    }

    return Results.Ok(projects);
});

app.Run();
