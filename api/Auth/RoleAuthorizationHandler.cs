using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Npgsql;

public class RoleRequirement(params string[] allowedRoles) : IAuthorizationRequirement
{
    public string[] AllowedRoles { get; } = allowedRoles;
}

public class RoleAuthorizationHandler(NpgsqlDataSource db) : AuthorizationHandler<RoleRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        RoleRequirement requirement)
    {
        var sub = context.User.FindFirstValue("sub");
        if (sub is null) return;

        await using var conn = await db.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT r.name FROM role r
            JOIN user_role ur ON ur.role_id = r.id
            JOIN "user" u ON u.id = ur.user_id
            WHERE u.keycloak_sub = $1
            """;
        cmd.Parameters.AddWithValue(sub);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            if (requirement.AllowedRoles.Contains(reader.GetString(0)))
            {
                context.Succeed(requirement);
                return;
            }
        }
    }
}
