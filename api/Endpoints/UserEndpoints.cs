using System.Security.Claims;
using Microsoft.Extensions.Logging;

public static class UserEndpoints
{
    public static WebApplication MapUserEndpoints(this WebApplication app)
    {
        app.MapGet("/me", async (ClaimsPrincipal user, UserRepository users, ILogger<Program> logger) =>
        {
            var sub = user.FindFirstValue("sub");
            var email = user.FindFirstValue("email") ?? user.FindFirstValue("preferred_username");

            if (sub is null || email is null)
                return Results.Unauthorized();

            logger.LogInformation("User fetched profile: {Email}", email);

            var me = await users.GetMeAsync(sub, email);
            return Results.Ok(me);
        }).RequireAuthorization();

        return app;
    }
}
