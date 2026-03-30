using Npgsql;

public static class DatabaseWebApplicationBuilderExtensions
{
    public static WebApplicationBuilder AddSiteSpeakDatabase(this WebApplicationBuilder builder)
    {
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Missing ConnectionStrings:DefaultConnection");

        var dataSource = NpgsqlDataSource.Create(connectionString);
        builder.Services.AddSingleton(dataSource);

        return builder;
    }
}
