using System.Security.Claims;

public static class ProjectEndpoints
{
    public static WebApplication MapProjectEndpoints(this WebApplication app)
    {
        app.MapGet("/my/projects", async (ClaimsPrincipal user, ProjectRepository projects) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var list = await projects.ListForKeycloakSubAsync(sub);
            return Results.Ok(list);
        }).RequireAuthorization();

        app.MapPost("/my/projects", async (ClaimsPrincipal user, ProjectBody body, ProjectRepository projects) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var created = await projects.CreateAsync(companyId.Value, body);
            if (created is null) return Results.Problem("Failed to create project.");
            return Results.Created($"/projects/{created.Id}", created);
        }).RequireAuthorization();

        app.MapPut("/projects/{id:guid}", async (Guid id, ProjectBody body, ProjectRepository projects) =>
        {
            var updated = await projects.UpdateAsync(id, body);
            if (updated is null) return Results.NotFound();
            return Results.Ok(updated);
        }).RequireAuthorization();

        app.MapDelete("/projects/{id:guid}", async (Guid id, ProjectRepository projects) =>
            await projects.SoftDeleteAsync(id) ? Results.NoContent() : Results.NotFound()).RequireAuthorization();

        return app;
    }
}
