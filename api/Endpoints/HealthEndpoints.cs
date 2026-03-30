public static class HealthEndpoints
{
    public static WebApplication MapHealthEndpoints(this WebApplication app)
    {
        app.MapGet("/", () => "Hello World!");

        app.MapGet("/health/db", async (HealthRepository health) =>
            Results.Ok(await health.PingAsync()));

        return app;
    }
}
