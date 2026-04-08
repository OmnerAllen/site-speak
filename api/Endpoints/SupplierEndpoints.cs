using SiteSpeak.Geo;

public static class SupplierEndpoints
{
    private const string GeocodeFailedMessage =
        "Address could not be geocoded. Check the address and try again.";

    public static WebApplication MapSupplierEndpoints(this WebApplication app)
    {
        app.MapGet("/suppliers", async (SupplierRepository suppliers) =>
            Results.Ok(await suppliers.ListAsync())).RequireAuthorization();

        app.MapPost("/suppliers", async (SupplierBody body, SupplierRepository suppliers, IGeocoder geocoder, CancellationToken cancellationToken) =>
        {
            var pt = await geocoder.GeocodeAsync(body.Address, cancellationToken);
            if (pt is null)
                return Results.BadRequest(new { error = GeocodeFailedMessage });
            var g = pt.Value;
            var created = await suppliers.CreateAsync(body, g.Latitude, g.Longitude, cancellationToken);
            if (created is null) return Results.Problem("Failed to create supplier.");
            return Results.Created($"/suppliers/{created.Id}", created);
        }).RequireAuthorization();

        app.MapPut("/suppliers/{id:guid}", async (Guid id, SupplierBody body, SupplierRepository suppliers, IGeocoder geocoder, CancellationToken cancellationToken) =>
        {
            var pt = await geocoder.GeocodeAsync(body.Address, cancellationToken);
            if (pt is null)
                return Results.BadRequest(new { error = GeocodeFailedMessage });
            var g = pt.Value;
            var updated = await suppliers.UpdateAsync(id, body, g.Latitude, g.Longitude, cancellationToken);
            if (updated is null) return Results.NotFound();
            return Results.Ok(updated);
        }).RequireAuthorization();

        app.MapDelete("/suppliers/{id:guid}", async (Guid id, SupplierRepository suppliers) =>
            await suppliers.SoftDeleteAsync(id) ? Results.NoContent() : Results.NotFound()).RequireAuthorization();

        return app;
    }
}
