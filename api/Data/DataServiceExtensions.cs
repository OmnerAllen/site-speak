public static class DataServiceExtensions
{
    public static WebApplicationBuilder AddSiteSpeakData(this WebApplicationBuilder builder)
    {
        builder.Services.AddSingleton<HealthRepository>();
        builder.Services.AddSingleton<UserRepository>();
        builder.Services.AddSingleton<SupplierRepository>();
        builder.Services.AddSingleton<EquipmentRepository>();
        builder.Services.AddSingleton<MaterialRepository>();
        builder.Services.AddSingleton<ProjectRepository>();
        return builder;
    }
}
