public static class EquipmentEndpoints
{
    public static WebApplication MapEquipmentEndpoints(this WebApplication app)
    {
        app.MapGet("/equipment", async (EquipmentRepository equipment) =>
            Results.Ok(await equipment.ListAsync())).RequireAuthorization();

        app.MapPost("/equipment", async (EquipmentBody body, EquipmentRepository equipment) =>
        {
            var created = await equipment.CreateAsync(body);
            if (created is null) return Results.Problem("Failed to create equipment.");
            return Results.Created($"/equipment/{created.Id}", created);
        }).RequireAuthorization();

        app.MapPut("/equipment/{id:guid}", async (Guid id, EquipmentBody body, EquipmentRepository equipment) =>
        {
            var updated = await equipment.UpdateAsync(id, body);
            if (updated is null) return Results.NotFound();
            return Results.Ok(updated);
        }).RequireAuthorization();

        app.MapDelete("/equipment/{id:guid}", async (Guid id, EquipmentRepository equipment) =>
            await equipment.SoftDeleteAsync(id) ? Results.NoContent() : Results.NotFound()).RequireAuthorization();

        return app;
    }
}
