public static class SiteSpeakEndpoints
{
    public static WebApplication MapSiteSpeakEndpoints(this WebApplication app)
    {
        app.MapHealthEndpoints();
        app.MapUserEndpoints();
        app.MapSupplierEndpoints();
        app.MapEquipmentEndpoints();
        app.MapMaterialEndpoints();
        app.MapProjectEndpoints();
        app.MapTelemetryEndpoints();
        return app;
    }
}
