using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

public class RoleRequirement(params string[] allowedRoles) : IAuthorizationRequirement
{
    public string[] AllowedRoles { get; } = allowedRoles;
}

public class RoleAuthorizationHandler(UserRepository users) : AuthorizationHandler<RoleRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        RoleRequirement requirement)
    {
        var sub = context.User.FindFirstValue("sub");
        if (sub is null) return;

        var roleNames = await users.GetRoleNamesForKeycloakSubAsync(sub);
        foreach (var name in roleNames)
        {
            if (requirement.AllowedRoles.Contains(name))
            {
                context.Succeed(requirement);
                return;
            }
        }
    }
}
