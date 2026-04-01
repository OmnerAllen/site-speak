using System.Security.Claims;

public static class EmployeeEndpoints
{
    public static WebApplication MapEmployeeEndpoints(this WebApplication app)
    {
        app.MapGet("/my/employees", async (ClaimsPrincipal user, ProjectRepository projects, EmployeeRepository employees) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            return Results.Ok(await employees.ListForCompanyAsync(companyId.Value));
        }).RequireAuthorization();

        app.MapPost("/my/employees", async (ClaimsPrincipal user, ProjectRepository projects, EmployeeRepository employees, EmployeeBody body) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var created = await employees.CreateAsync(companyId.Value, body);
            if (created is null) return Results.BadRequest(new { error = "Invalid employee data." });
            return Results.Created($"/my/employees/{created.Id}", created);
        }).RequireAuthorization();

        app.MapPut("/my/employees/{id:guid}", async (Guid id, ClaimsPrincipal user, ProjectRepository projects, EmployeeRepository employees, EmployeeBody body) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var updated = await employees.UpdateAsync(id, companyId.Value, body);
            if (updated is null) return Results.NotFound();
            return Results.Ok(updated);
        }).RequireAuthorization();

        app.MapDelete("/my/employees/{id:guid}", async (Guid id, ClaimsPrincipal user, ProjectRepository projects, EmployeeRepository employees) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            return await employees.SoftDeleteAsync(id, companyId.Value) ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();

        return app;
    }
}
