public static class SupplierEndpoints
{
    public static WebApplication MapSupplierEndpoints(this WebApplication app)
    {
        app.MapGet("/suppliers", async (SupplierRepository suppliers) =>
            Results.Ok(await suppliers.ListAsync())).RequireAuthorization();

        app.MapPost("/suppliers", async (SupplierBody body, SupplierRepository suppliers) =>
        {
            var created = await suppliers.CreateAsync(body);
            if (created is null) return Results.Problem("Failed to create supplier.");
            return Results.Created($"/suppliers/{created.Id}", created);
        }).RequireAuthorization();

        app.MapPut("/suppliers/{id:guid}", async (Guid id, SupplierBody body, SupplierRepository suppliers) =>
        {
            var updated = await suppliers.UpdateAsync(id, body);
            if (updated is null) return Results.NotFound();
            return Results.Ok(updated);
        }).RequireAuthorization();

        app.MapDelete("/suppliers/{id:guid}", async (Guid id, SupplierRepository suppliers) =>
            await suppliers.SoftDeleteAsync(id) ? Results.NoContent() : Results.NotFound()).RequireAuthorization();

        return app;
    }
}
