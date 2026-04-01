public static class MaterialEndpoints
{
    public static WebApplication MapMaterialEndpoints(this WebApplication app)
    {
        app.MapGet("/materials", async (MaterialRepository materials) =>
            Results.Ok(await materials.ListAsync())).RequireAuthorization();

        app.MapPost("/materials", async (MaterialBody body, MaterialRepository materials) =>
        {
            var id = await materials.CreateAsync(body);
            if (id is null) return Results.Problem("Failed to create material.");
            return Results.Created($"/materials/{id}", new
            {
                id,
                productName = body.ProductName,
                supplierName = body.SupplierName,
                unit = body.Unit,
                productType = body.ProductType,
                pricePerUnit = body.PricePerUnit
            });
        }).RequireAuthorization();

        app.MapPut("/materials/{id:guid}", async (Guid id, MaterialBody body, MaterialRepository materials) =>
        {
            if (!await materials.UpdateAsync(id, body)) return Results.NotFound();
            return Results.Ok(new
            {
                id,
                productName = body.ProductName,
                supplierName = body.SupplierName,
                unit = body.Unit,
                productType = body.ProductType,
                pricePerUnit = body.PricePerUnit
            });
        }).RequireAuthorization();

        app.MapDelete("/materials/{id:guid}", async (Guid id, MaterialRepository materials) =>
            await materials.SoftDeleteAsync(id) ? Results.NoContent() : Results.NotFound()).RequireAuthorization();

        return app;
    }
}
