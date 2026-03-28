using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using OpenTelemetry.Logs;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using OpenTelemetry.Metrics;

var builder = WebApplication.CreateBuilder(args);

// 1. Define the Base HTTP URL (Port 4318)
const string serviceName = "SiteSpeak";
const string otlpBaseUrl = "http://otel-collector:4318";

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.Logging.AddOpenTelemetry(logging =>
{
    logging.IncludeScopes = true;
    logging.IncludeFormattedMessage = true;
    logging.SetResourceBuilder(ResourceBuilder.CreateDefault().AddService(serviceName));
    logging.AddOtlpExporter(options =>
    {
        options.Endpoint = new Uri($"{otlpBaseUrl}/v1/logs");
        options.Protocol = OpenTelemetry.Exporter.OtlpExportProtocol.HttpProtobuf;
    });
});

builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService(serviceName))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddOtlpExporter(options =>
        {
            options.Endpoint = new Uri($"{otlpBaseUrl}/v1/traces");
            options.Protocol = OpenTelemetry.Exporter.OtlpExportProtocol.HttpProtobuf;
        })
    )
    .WithMetrics(metrics => metrics
        .AddMeter(SiteSpeakMetrics.MeterName)
        .AddAspNetCoreInstrumentation()
        .AddOtlpExporter(options =>
        {
            options.Endpoint = new Uri($"{otlpBaseUrl}/v1/metrics");
            options.Protocol = OpenTelemetry.Exporter.OtlpExportProtocol.HttpProtobuf;
        })
    );

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Missing ConnectionStrings:DefaultConnection");

var dataSource = NpgsqlDataSource.Create(connectionString);
builder.Services.AddSingleton(dataSource);

var keycloakIssuer = "https://auth.snowse-ts.duckdns.org/realms/frontend";

var jwksJson = """
{
  "keys": [
    {
      "kid": "QCMM6Ws8urf86xprUGjcpF5zEcsOF1A2HxuHicXeK0Q",
      "kty": "RSA",
      "alg": "RS256",
      "use": "sig",
      "n": "oDG0QYYHCDPNn3QbDJF4bI5k3DdyzNMkUp5hTV75AjXm_8Hx5lZR99rfDz5t08PqOjZwiXfxlLYcWGTHhlrzk7CcAZl-2wcQkIGmpEQJnQWT_xh5CTWHjGXMhAYyr5AQwaJpjsAp5hVPj8aTbW5hk8s4KM_yroP7dFjWJWkV1gSITB8dFyWDhD-GY-Xxoj9WuMPxyL1aswwDqab-kYKMOkQeeSo2dMEz1IYeTXA3NEPrJlNIfTmPJbQUremzkyIgtFkwb_RhQeOUPrZDMbdH2WeBvd3_rFq9aCZERyPqbKl-kIMUMCbEKUt-mo0K8wlSLFS58syRJIAUG_thfYuc8Q",
      "e": "AQAB",
      "x5c": [
        "MIICnzCCAYcCBgGcWNGrCzANBgkqhkiG9w0BAQsFADATMREwDwYDVQQDDAhmcm9udGVuZDAeFw0yNjAyMTMyMTAyNDFaFw0zNjAyMTMyMTA0MjFaMBMxETAPBgNVBAMMCGZyb250ZW5kMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoDG0QYYHCDPNn3QbDJF4bI5k3DdyzNMkUp5hTV75AjXm/8Hx5lZR99rfDz5t08PqOjZwiXfxlLYcWGTHhlrzk7CcAZl+2wcQkIGmpEQJnQWT/xh5CTWHjGXMhAYyr5AQwaJpjsAp5hVPj8aTbW5hk8s4KM/yroP7dFjWJWkV1gSITB8dFyWDhD+GY+Xxoj9WuMPxyL1aswwDqab+kYKMOkQeeSo2dMEz1IYeTXA3NEPrJlNIfTmPJbQUremzkyIgtFkwb/RhQeOUPrZDMbdH2WeBvd3/rFq9aCZERyPqbKl+kIMUMCbEKUt+mo0K8wlSLFS58syRJIAUG/thfYuc8QIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQAbT7Ur/SRjo4ggd2VVJ9nDLKCLDGjhNbB+rsXEWxUmiVXzellDWJuRkeytCHg4rF49JZIMHbJ/cou2FDIDQ0BxHg3l+bLdY9fKUggviqaROY14MqdYKousb1B7uL0hVByHkMGh6wsz06OxsqCmVmrDIPukh83D4VGtgKoskc8XtZTh7TF+jqigrE+dqAlni+PulKbvZiTLLbfFh9mGldwEwO648d5Xo6jMzSL6IvGZ5nX0L4SeweUupkEbjAVIwBzaVJTaCmqAvmPqFFPJeDzSQflfP+s8SB3ZoxgMJCTEpy8w+F23aG+DR3CB1o+eqOJr53/RUSfsE3Ztfja0sTDQ"
      ],
      "x5t": "sk-vJA54gYQ8vdBYV23HQ-LibD8",
      "x5t#S256": "L9DSSIQYAbIDj9XsV_c5AQzyVnTOPa_VV57IIKW_Ah4"
    },
    {
      "kid": "PHMvgWqhe1SFwpPN7WuGi9y9HsJ7LX2zK9VsoB7jups",
      "kty": "RSA",
      "alg": "RSA-OAEP",
      "use": "enc",
      "n": "0XClmhvcs42FQxLCJCvNAiw3f-BnIw9QxLL5zvwoTq_y7wJeCOihEciT0hw7jXlm8FndvMxZ8H_Y_sUGMpwPmH1JPDFkNdO-V4ifTEk9-AeL6IExoHY-QjqiFsyB2bRWWRJHlv2Afk1upmXE6JI6GrJbFIVrg--M6sgZyR-qd3yfkpPwMfUe5ejZoGzE033JkII2ZfK-0qFZNczscgJ_D00Z0bOWpl8V5RAOK-yTXV5LWUOq9qq4UG05VfgqXaYk2_QImYtiJRLa4BwPy_I30rJwXbpHotQEieFBp0aESG7OgD2IaS-plg1Zt0M-9xFEVuDJ50nKyckXnfeTgEKgiQ",
      "e": "AQAB",
      "x5c": [
        "MIICnzCCAYcCBgGcWNGrQzANBgkqhkiG9w0BAQsFADATMREwDwYDVQQDDAhmcm9udGVuZDAeFw0yNjAyMTMyMTAyNDFaFw0zNjAyMTMyMTA0MjFaMBMxETAPBgNVBAMMCGZyb250ZW5kMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0XClmhvcs42FQxLCJCvNAiw3f+BnIw9QxLL5zvwoTq/y7wJeCOihEciT0hw7jXlm8FndvMxZ8H/Y/sUGMpwPmH1JPDFkNdO+V4ifTEk9+AeL6IExoHY+QjqiFsyB2bRWWRJHlv2Afk1upmXE6JI6GrJbFIVrg++M6sgZyR+qd3yfkpPwMfUe5ejZoGzE033JkII2ZfK+0qFZNczscgJ/D00Z0bOWpl8V5RAOK+yTXV5LWUOq9qq4UG05VfgqXaYk2/QImYtiJRLa4BwPy/I30rJwXbpHotQEieFBp0aESG7OgD2IaS+plg1Zt0M+9xFEVuDJ50nKyckXnfeTgEKgiQIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQDBkmiOaf1QldjR37MDXJTutXyoIfcD+BAPfClUYkdCyXpYCS0Rqik6yxMZYltb0ZsWsOlSMbYBGbkN6QCYVTCFec62P/aTD3f7KSX7EzHjFRbCvrzwGj/GEJ5JFt7Hu28mkLpcDazyzrcfixHlXZLsAvdWNUpDWCFzbT6XvP4r0iq7cc856mDK57ho0n2VaorPpdot4aXPC7rm8kD3PCDPVECbi7hE9+rSsShA/3aTGHaYaYSK6r22TwR+FARX/gCoVACKkBIHwslcNelf9pK38ygkuXGMj0qJlu7eYaEbVlqTCzU5WCFgCmfp1Nv++GPUGiHsPdMFwnMwKi7AJAzP"
      ],
      "x5t": "82sTfZOtkX-P0BP7BA5eCRVyvPU",
      "x5t#S256": "OmbDuPogoghFH6G-79gZVwRdTgNTrgG1rQBREDohnxc"
    }
  ]
}
""";

var jwks = new JsonWebKeySet(jwksJson);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false,
            ValidIssuer = keycloakIssuer,
            IssuerSigningKeys = jwks.GetSigningKeys(),
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                context.Token = context.Request.Cookies["id_token"];
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("AdminOnly", policy =>
        policy.AddRequirements(new RoleRequirement("admin")))
    .AddPolicy("WorkerOrAdmin", policy =>
        policy.AddRequirements(new RoleRequirement("worker", "admin")));

builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, RoleAuthorizationHandler>();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

// ── Health ───────────────────────────────────────────────────────────────

app.MapGet("/", () => "Hello World!");

app.MapGet("/health/db", async (NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT 1";
    var result = await cmd.ExecuteScalarAsync();
    return Results.Ok(new { status = "healthy", result });
});

// ── User ─────────────────────────────────────────────────────────────────

app.MapGet("/me", async (ClaimsPrincipal user, NpgsqlDataSource db) =>
{
    var sub = user.FindFirstValue("sub");
    var email = user.FindFirstValue("email") ?? user.FindFirstValue("preferred_username");

    if (sub is null || email is null)
        return Results.Unauthorized();

    await using var conn = await db.OpenConnectionAsync();

    Guid userId;
    Guid? employeeId = null;
    Guid? companyId = null;

    await using (var findCmd = conn.CreateCommand())
    {
        findCmd.CommandText = """SELECT id, employee_id, company_id FROM "user" WHERE keycloak_sub = $1""";
        findCmd.Parameters.AddWithValue(sub);

        await using var reader = await findCmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
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
            await using var insertReader = await insertCmd.ExecuteReaderAsync();
            await insertReader.ReadAsync();
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
        companyName = (string?)await compCmd.ExecuteScalarAsync();
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
        await using var reader = await rolesCmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
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
        await using var reader = await permsCmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            permissions.Add(reader.GetString(0));
    }

    return Results.Ok(new
    {
        id = userId,
        keycloakSub = sub,
        email,
        employeeId,
        companyId,
        companyName,
        roles,
        permissions
    });
}).RequireAuthorization();

// ── Suppliers ────────────────────────────────────────────────────────────

app.MapGet("/suppliers", async (NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT id, name, address, phone FROM supplier WHERE deleted_at IS NULL ORDER BY name";

    var list = new List<object>();
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        list.Add(new
        {
            id = reader.GetGuid(0),
            name = reader.GetString(1),
            address = reader.GetString(2),
            phone = reader.IsDBNull(3) ? "" : reader.GetString(3)
        });
    }
    return Results.Ok(list);
}).RequireAuthorization();

app.MapPost("/suppliers", async (SupplierBody body, NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        INSERT INTO supplier (name, address, phone)
        VALUES ($1, $2, $3)
        RETURNING id, name, address, phone
        """;
    cmd.Parameters.AddWithValue(body.Name);
    cmd.Parameters.AddWithValue(body.Address);
    cmd.Parameters.AddWithValue((object?)body.Phone ?? DBNull.Value);

    await using var reader = await cmd.ExecuteReaderAsync();
    await reader.ReadAsync();
    return Results.Created($"/suppliers/{reader.GetGuid(0)}", new
    {
        id = reader.GetGuid(0),
        name = reader.GetString(1),
        address = reader.GetString(2),
        phone = reader.IsDBNull(3) ? "" : reader.GetString(3)
    });
}).RequireAuthorization();

app.MapPut("/suppliers/{id:guid}", async (Guid id, SupplierBody body, NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        UPDATE supplier SET name = $2, address = $3, phone = $4, updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, name, address, phone
        """;
    cmd.Parameters.AddWithValue(id);
    cmd.Parameters.AddWithValue(body.Name);
    cmd.Parameters.AddWithValue(body.Address);
    cmd.Parameters.AddWithValue((object?)body.Phone ?? DBNull.Value);

    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync()) return Results.NotFound();
    return Results.Ok(new
    {
        id = reader.GetGuid(0),
        name = reader.GetString(1),
        address = reader.GetString(2),
        phone = reader.IsDBNull(3) ? "" : reader.GetString(3)
    });
}).RequireAuthorization();

app.MapDelete("/suppliers/{id:guid}", async (Guid id, NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "UPDATE supplier SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL";
    cmd.Parameters.AddWithValue(id);
    return await cmd.ExecuteNonQueryAsync() > 0 ? Results.NoContent() : Results.NotFound();
}).RequireAuthorization();

// ── Equipment ────────────────────────────────────────────────────────────

app.MapGet("/equipment", async (NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT id, name, cost_per_day, cost_half_day, place_to_rent_from FROM equipment WHERE deleted_at IS NULL ORDER BY name";

    var list = new List<object>();
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        list.Add(new
        {
            id = reader.GetGuid(0),
            name = reader.GetString(1),
            costPerDay = reader.GetDecimal(2),
            costHalfDay = reader.GetDecimal(3),
            placeToRentFrom = reader.IsDBNull(4) ? "" : reader.GetString(4)
        });
    }
    return Results.Ok(list);
}).RequireAuthorization();

app.MapPost("/equipment", async (EquipmentBody body, NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        INSERT INTO equipment (name, cost_per_day, cost_half_day, place_to_rent_from)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, cost_per_day, cost_half_day, place_to_rent_from
        """;
    cmd.Parameters.AddWithValue(body.Name);
    cmd.Parameters.AddWithValue(body.CostPerDay);
    cmd.Parameters.AddWithValue(body.CostHalfDay);
    cmd.Parameters.AddWithValue(body.PlaceToRentFrom);

    await using var reader = await cmd.ExecuteReaderAsync();
    await reader.ReadAsync();
    return Results.Created($"/equipment/{reader.GetGuid(0)}", new
    {
        id = reader.GetGuid(0),
        name = reader.GetString(1),
        costPerDay = reader.GetDecimal(2),
        costHalfDay = reader.GetDecimal(3),
        placeToRentFrom = reader.IsDBNull(4) ? "" : reader.GetString(4)
    });
}).RequireAuthorization();

app.MapPut("/equipment/{id:guid}", async (Guid id, EquipmentBody body, NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        UPDATE equipment SET name = $2, cost_per_day = $3, cost_half_day = $4, place_to_rent_from = $5, updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, name, cost_per_day, cost_half_day, place_to_rent_from
        """;
    cmd.Parameters.AddWithValue(id);
    cmd.Parameters.AddWithValue(body.Name);
    cmd.Parameters.AddWithValue(body.CostPerDay);
    cmd.Parameters.AddWithValue(body.CostHalfDay);
    cmd.Parameters.AddWithValue(body.PlaceToRentFrom);

    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync()) return Results.NotFound();
    return Results.Ok(new
    {
        id = reader.GetGuid(0),
        name = reader.GetString(1),
        costPerDay = reader.GetDecimal(2),
        costHalfDay = reader.GetDecimal(3),
        placeToRentFrom = reader.IsDBNull(4) ? "" : reader.GetString(4)
    });
}).RequireAuthorization();

app.MapDelete("/equipment/{id:guid}", async (Guid id, NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "UPDATE equipment SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL";
    cmd.Parameters.AddWithValue(id);
    return await cmd.ExecuteNonQueryAsync() > 0 ? Results.NoContent() : Results.NotFound();
}).RequireAuthorization();

// ── Materials ────────────────────────────────────────────────────────────

app.MapGet("/materials", async (NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        SELECT m.id, m.product_name, s.name, m.unit, m.product_type, m.price_per_unit, m.currency
        FROM material m
        LEFT JOIN supplier s ON s.id = m.supplier_id
        WHERE m.deleted_at IS NULL
        ORDER BY m.product_name
        """;

    var list = new List<object>();
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        list.Add(new
        {
            id = reader.GetGuid(0),
            productName = reader.GetString(1),
            supplierName = reader.IsDBNull(2) ? "" : reader.GetString(2),
            unit = reader.IsDBNull(3) ? "" : reader.GetString(3),
            productType = reader.IsDBNull(4) ? "" : reader.GetString(4),
            pricePerUnit = reader.IsDBNull(5) ? 0m : reader.GetDecimal(5),
            currency = reader.IsDBNull(6) ? "USD" : reader.GetString(6)
        });
    }
    return Results.Ok(list);
}).RequireAuthorization();

app.MapPost("/materials", async (MaterialBody body, NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();

    Guid? supplierId = await LookupSupplier(conn, body.SupplierName);

    await using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        INSERT INTO material (product_name, supplier_id, unit, product_type, price_per_unit, currency)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        """;
    cmd.Parameters.AddWithValue(body.ProductName);
    cmd.Parameters.AddWithValue((object?)supplierId ?? DBNull.Value);
    cmd.Parameters.AddWithValue(body.Unit);
    cmd.Parameters.AddWithValue(body.ProductType);
    cmd.Parameters.AddWithValue(body.PricePerUnit);
    cmd.Parameters.AddWithValue(body.Currency);

    var id = (Guid)(await cmd.ExecuteScalarAsync())!;
    return Results.Created($"/materials/{id}", new
    {
        id,
        productName = body.ProductName,
        supplierName = body.SupplierName,
        unit = body.Unit,
        productType = body.ProductType,
        pricePerUnit = body.PricePerUnit,
        currency = body.Currency
    });
}).RequireAuthorization();

app.MapPut("/materials/{id:guid}", async (Guid id, MaterialBody body, NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();

    Guid? supplierId = await LookupSupplier(conn, body.SupplierName);

    await using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        UPDATE material SET product_name = $2, supplier_id = $3, unit = $4, product_type = $5, price_per_unit = $6, currency = $7, updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
        """;
    cmd.Parameters.AddWithValue(id);
    cmd.Parameters.AddWithValue(body.ProductName);
    cmd.Parameters.AddWithValue((object?)supplierId ?? DBNull.Value);
    cmd.Parameters.AddWithValue(body.Unit);
    cmd.Parameters.AddWithValue(body.ProductType);
    cmd.Parameters.AddWithValue(body.PricePerUnit);
    cmd.Parameters.AddWithValue(body.Currency);

    if (await cmd.ExecuteScalarAsync() is null) return Results.NotFound();
    return Results.Ok(new
    {
        id,
        productName = body.ProductName,
        supplierName = body.SupplierName,
        unit = body.Unit,
        productType = body.ProductType,
        pricePerUnit = body.PricePerUnit,
        currency = body.Currency
    });
}).RequireAuthorization();

app.MapDelete("/materials/{id:guid}", async (Guid id, NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "UPDATE material SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL";
    cmd.Parameters.AddWithValue(id);
    return await cmd.ExecuteNonQueryAsync() > 0 ? Results.NoContent() : Results.NotFound();
}).RequireAuthorization();

// ── Projects ─────────────────────────────────────────────────────────────

app.MapGet("/my/projects", async (ClaimsPrincipal user, NpgsqlDataSource db) =>
{
    var sub = user.FindFirstValue("sub");
    if (sub is null) return Results.Unauthorized();

    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        SELECT p.id, p.name, p.address, p.created_at, p.updated_at
        FROM project p
        JOIN "user" u ON u.company_id = p.company_id
        WHERE u.keycloak_sub = $1 AND p.deleted_at IS NULL
        ORDER BY p.created_at
        """;
    cmd.Parameters.AddWithValue(sub);

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
}).RequireAuthorization();

app.MapPost("/my/projects", async (ClaimsPrincipal user, ProjectBody body, NpgsqlDataSource db) =>
{
    var sub = user.FindFirstValue("sub");
    if (sub is null) return Results.Unauthorized();

    await using var conn = await db.OpenConnectionAsync();

    await using var compCmd = conn.CreateCommand();
    compCmd.CommandText = """SELECT company_id FROM "user" WHERE keycloak_sub = $1""";
    compCmd.Parameters.AddWithValue(sub);
    var companyId = await compCmd.ExecuteScalarAsync() as Guid?;
    if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

    await using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        INSERT INTO project (company_id, name, address)
        VALUES ($1, $2, $3)
        RETURNING id, name, address, created_at, updated_at
        """;
    cmd.Parameters.AddWithValue(companyId.Value);
    cmd.Parameters.AddWithValue(body.Name);
    cmd.Parameters.AddWithValue(body.Address);

    await using var reader = await cmd.ExecuteReaderAsync();
    await reader.ReadAsync();
    return Results.Created($"/projects/{reader.GetGuid(0)}", new
    {
        id = reader.GetGuid(0),
        name = reader.GetString(1),
        address = reader.GetString(2),
        createdAt = reader.GetDateTime(3),
        updatedAt = reader.GetDateTime(4)
    });
}).RequireAuthorization();

app.MapPut("/projects/{id:guid}", async (Guid id, ProjectBody body, NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        UPDATE project SET name = $2, address = $3, updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, name, address, created_at, updated_at
        """;
    cmd.Parameters.AddWithValue(id);
    cmd.Parameters.AddWithValue(body.Name);
    cmd.Parameters.AddWithValue(body.Address);

    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync()) return Results.NotFound();
    return Results.Ok(new
    {
        id = reader.GetGuid(0),
        name = reader.GetString(1),
        address = reader.GetString(2),
        createdAt = reader.GetDateTime(3),
        updatedAt = reader.GetDateTime(4)
    });
}).RequireAuthorization();

app.MapDelete("/projects/{id:guid}", async (Guid id, NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "UPDATE project SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL";
    cmd.Parameters.AddWithValue(id);
    return await cmd.ExecuteNonQueryAsync() > 0 ? Results.NoContent() : Results.NotFound();
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

record SupplierBody(string Name, string Address, string? Phone);
record EquipmentBody(string Name, decimal CostPerDay, decimal CostHalfDay, string PlaceToRentFrom);
record MaterialBody(string ProductName, string? SupplierName, string Unit, string ProductType, decimal PricePerUnit, string Currency);
record ProjectBody(string Name, string Address);
