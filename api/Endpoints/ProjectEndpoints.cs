using System.Security.Claims;

public static class ProjectEndpoints
{
    public static WebApplication MapProjectEndpoints(this WebApplication app)
    {
        app.MapGet("/my/projects", async (ClaimsPrincipal user, ProjectRepository projects) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var list = await projects.ListForCompanyAsync(companyId.Value);
            return Results.Ok(list);
        }).RequireAuthorization();

        app.MapGet("/my/schedule", async (ClaimsPrincipal user, ProjectRepository projects) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var list = await projects.ListScheduleForCompanyAsync(companyId.Value);
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

        app.MapPut("/projects/{id:guid}", async (Guid id, ClaimsPrincipal user, ProjectBody body, ProjectRepository projects) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var updated = await projects.UpdateAsync(id, companyId.Value, body);
            if (updated is null) return Results.NotFound();
            return Results.Ok(updated);
        }).RequireAuthorization();

        app.MapDelete("/projects/{id:guid}", async (Guid id, ClaimsPrincipal user, ProjectRepository projects) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            return await projects.SoftDeleteAsync(id, companyId.Value) ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();

        app.MapGet("/my/projects/{id:guid}/details", async (Guid id, ClaimsPrincipal user, ProjectRepository projects) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var details = await projects.GetDetailsAsync(id, companyId.Value);
            return details is null ? Results.NotFound() : Results.Ok(details);
        }).RequireAuthorization();

        app.MapPut("/my/projects/{id:guid}/details", async (Guid id, ClaimsPrincipal user, ProjectDetailsBody body, ProjectRepository projects) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var result = await projects.UpdateDetailsAsync(id, companyId.Value, body);
            return result switch
            {
                ProjectDetailsUpdateResult.Ok => Results.NoContent(),
                ProjectDetailsUpdateResult.NotFound => Results.NotFound(),
                ProjectDetailsUpdateResult.StagesRequired => Results.BadRequest(new { error = "Stages payload is required" }),
                ProjectDetailsUpdateResult.InvalidStage => Results.BadRequest(new { error = "Invalid stage name in payload" }),
                _ => Results.Problem("Unexpected result.")
            };
        }).RequireAuthorization();

        app.MapPatch("/my/projects/{id:guid}/schedule", async (Guid id, ClaimsPrincipal user, ProjectScheduleBody body, ProjectRepository projects) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var stages = body.Stages ?? Array.Empty<StageScheduleItem>();
            foreach (var item in stages)
            {
                if (!string.IsNullOrWhiteSpace(item.PlannedStartDate) && !string.IsNullOrWhiteSpace(item.PlannedEndDate)
                    && DateOnly.TryParse(item.PlannedStartDate, out var ds)
                    && DateOnly.TryParse(item.PlannedEndDate, out var de)
                    && ds > de)
                {
                    return Results.BadRequest(new { error = "Planned start must be on or before planned end for each stage." });
                }
            }

            var (result, updated) = await projects.UpdateScheduleAsync(id, companyId.Value, new ProjectScheduleBody(stages));
            return result switch
            {
                SchedulePatchResult.Ok when updated is not null => Results.Ok(updated),
                SchedulePatchResult.ProjectNotFound => Results.NotFound(),
                SchedulePatchResult.InvalidStage => Results.BadRequest(new { error = "One or more stages do not belong to this project." }),
                _ => Results.Problem("Unexpected result.")
            };
        }).RequireAuthorization();

        return app;
    }
}
