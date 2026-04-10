using System.Security.Claims;
using Microsoft.Extensions.Logging;
using SiteSpeak.Estimates;
using SiteSpeak.Geo;
using SiteSpeak.Logic;

public static class ProjectEndpoints
{
    private const string GeocodeFailedMessage =
        "Address could not be geocoded. Check the address and try again.";

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

        app.MapPost("/my/projects", async (ClaimsPrincipal user, ProjectBody body, ProjectRepository projects, IGeocoder geocoder, ILogger<Program> logger, CancellationToken cancellationToken) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var pt = await geocoder.GeocodeAsync(body.Address, cancellationToken);
            if (pt is null)
                return Results.BadRequest(new { error = GeocodeFailedMessage });
            var g = pt.Value;

            var created = await projects.CreateAsync(companyId.Value, body, g.Latitude, g.Longitude, cancellationToken);
            if (created is null) return Results.Problem("Failed to create project.");

            var email = user.FindFirstValue("email") ?? user.FindFirstValue("preferred_username") ?? "Unknown";
            logger.LogInformation("User {Email} created project '{ProjectName}' (ID: {ProjectId})", email, created.Name, created.Id);

            return Results.Created($"/projects/{created.Id}", created);
        }).RequireAuthorization();

        app.MapPut("/projects/{id:guid}", async (Guid id, ClaimsPrincipal user, ProjectBody body, ProjectRepository projects, IGeocoder geocoder, CancellationToken cancellationToken) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var pt = await geocoder.GeocodeAsync(body.Address, cancellationToken);
            if (pt is null)
                return Results.BadRequest(new { error = GeocodeFailedMessage });
            var g = pt.Value;

            var updated = await projects.UpdateAsync(id, companyId.Value, body, g.Latitude, g.Longitude, cancellationToken);
            if (updated is null) return Results.NotFound();
            return Results.Ok(updated);
        }).RequireAuthorization();

        app.MapDelete("/projects/{id:guid}", async (Guid id, ClaimsPrincipal user, ProjectRepository projects, ILogger<Program> logger) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var deleted = await projects.SoftDeleteAsync(id, companyId.Value);
            if (deleted)
            {
                var email = user.FindFirstValue("email") ?? user.FindFirstValue("preferred_username") ?? "Unknown";
                logger.LogInformation("User {Email} deleted project {ProjectId}", email, id);
                return Results.NoContent();
            }
            return Results.NotFound();
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

        app.MapPut("/my/projects/{id:guid}/details", async (Guid id, ClaimsPrincipal user, ProjectDetailsBody body, ProjectRepository projects, IGeocoder geocoder, CancellationToken cancellationToken) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var existing = await projects.GetDetailsAsync(id, companyId.Value, cancellationToken);
            if (existing is null)
                return Results.NotFound();

            double latitude;
            double longitude;
            var incoming = body.Address.Trim();
            var stored = existing.Address.Trim();
            if (string.Equals(stored, incoming, StringComparison.Ordinal)
                && existing.Latitude.HasValue
                && existing.Longitude.HasValue)
            {
                latitude = existing.Latitude.Value;
                longitude = existing.Longitude.Value;
            }
            else
            {
                var pt = await geocoder.GeocodeAsync(body.Address, cancellationToken);
                if (pt is null)
                    return Results.BadRequest(new { error = GeocodeFailedMessage });
                latitude = pt.Value.Latitude;
                longitude = pt.Value.Longitude;
            }

            var result = await projects.UpdateDetailsAsync(id, companyId.Value, body, latitude, longitude, cancellationToken);
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
                if (ScheduleStageValidation.IsPlannedRangeInvalid(item.PlannedStartDate, item.PlannedEndDate))
                    return Results.BadRequest(new { error = "Planned start must be on or before planned end for each stage." });
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

        app.MapPost("/my/projects/{id:guid}/material-estimate", async (
            Guid id,
            ClaimsPrincipal user,
            MaterialEstimateRequestBody? body,
            MaterialEstimateService estimates,
            ProjectRepository projects,
            CancellationToken cancellationToken) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            try
            {
                var result = await estimates.BuildEstimateSeedAsync(id, companyId.Value, body, cancellationToken);
                return result is null ? Results.NotFound() : Results.Ok(result);
            }
            catch (ArgumentOutOfRangeException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        }).RequireAuthorization();

        app.MapGet("/my/projects/{id:guid}/stage-resources", async (
            Guid id,
            ClaimsPrincipal user,
            ProjectRepository projects) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var result = await projects.GetStageResourcesAsync(id, companyId.Value);
            return result is null ? Results.NotFound() : Results.Ok(result);
        }).RequireAuthorization();

        app.MapPut("/my/projects/{id:guid}/stage-resources", async (
            Guid id,
            ClaimsPrincipal user,
            StageResourcesPutBody body,
            ProjectRepository projects) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var result = await projects.ReplaceStageResourcesAsync(id, companyId.Value, body);
            return result switch
            {
                StageResourcesReplaceResult.Ok => Results.NoContent(),
                StageResourcesReplaceResult.ProjectNotFound => Results.NotFound(),
                StageResourcesReplaceResult.InvalidStage => Results.BadRequest(new { error = "Invalid stage payload" }),
                StageResourcesReplaceResult.InvalidMaterial => Results.BadRequest(new { error = "Unknown material or invalid quantity" }),
                StageResourcesReplaceResult.InvalidEquipment => Results.BadRequest(new { error = "Unknown equipment" }),
                _ => Results.Problem("Unexpected result.")
            };
        }).RequireAuthorization();

        return app;
    }
}
