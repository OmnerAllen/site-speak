using System.Security.Claims;

public static class WorkLogEndpoints
{
    public static WebApplication MapWorkLogEndpoints(this WebApplication app)
    {
        app.MapGet("/my/work-logs", async (ClaimsPrincipal user, ProjectRepository projects, WorkLogRepository workLogs) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            return Results.Ok(await workLogs.ListForCompanyAsync(companyId.Value));
        }).RequireAuthorization();

        app.MapPost("/my/work-logs", async (ClaimsPrincipal user, ProjectRepository projects, WorkLogRepository workLogs, WorkLogBody body) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var created = await workLogs.CreateAsync(companyId.Value, body);
            if (created is null) return Results.BadRequest(new { error = "Invalid work log (check times, employee, and project)." });
            return Results.Created($"/my/work-logs/{created.Id}", created);
        }).RequireAuthorization();

        app.MapPut("/my/work-logs/{id:guid}", async (Guid id, ClaimsPrincipal user, ProjectRepository projects, WorkLogRepository workLogs, WorkLogBody body) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var updated = await workLogs.UpdateAsync(id, companyId.Value, body);
            if (updated is null) return Results.NotFound();
            return Results.Ok(updated);
        }).RequireAuthorization();

        app.MapDelete("/my/work-logs/{id:guid}", async (Guid id, ClaimsPrincipal user, ProjectRepository projects, WorkLogRepository workLogs) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            return await workLogs.SoftDeleteAsync(id, companyId.Value) ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();

        return app;
    }
}
