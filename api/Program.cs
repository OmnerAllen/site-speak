using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

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
                var token = context.Request.Cookies["id_token"];
                Console.WriteLine($"[Auth:MessageReceived] Path={context.Request.Path} CookiePresent={token is not null} TokenLength={token?.Length ?? 0}");
                context.Token = token;
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                var sub = context.Principal?.FindFirstValue("sub");
                var email = context.Principal?.FindFirstValue("email");
                Console.WriteLine($"[Auth:TokenValidated] sub={sub} email={email}");
                return Task.CompletedTask;
            },
            OnAuthenticationFailed = context =>
            {
                Console.WriteLine($"[Auth:FAILED] {context.Exception.GetType().Name}: {context.Exception.Message}");
                if (context.Exception.InnerException is not null)
                    Console.WriteLine($"[Auth:FAILED:Inner] {context.Exception.InnerException.Message}");
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                Console.WriteLine($"[Auth:Challenge] Path={context.Request.Path} Error={context.Error} ErrorDescription={context.ErrorDescription}");
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

Console.WriteLine($"[Startup] Auth issuer: {keycloakIssuer} (using embedded JWKS — no runtime discovery needed)");

// ── Public ──────────────────────────────────────────────────────────────

app.MapGet("/", () => "Hello World!");

app.MapGet("/health/db", async (NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT 1";
    var result = await cmd.ExecuteScalarAsync();
    return Results.Ok(new { status = "healthy", result });
});

app.MapGet("/health/auth", () => Results.Ok(new
{
    status = "ok",
    issuer = keycloakIssuer,
    mode = "embedded JWKS",
    signingKeys = jwks.GetSigningKeys().Count()
}));

// ── Auth ────────────────────────────────────────────────────────────────

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
        WHERE u.keycloak_sub = $1
          AND p.deleted_at IS NULL
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

// ── Protected ───────────────────────────────────────────────────────────

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
}).RequireAuthorization();

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
}).RequireAuthorization();

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
}).RequireAuthorization();

app.Run();
