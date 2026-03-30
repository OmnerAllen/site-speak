using Npgsql;

public class HealthRepository(NpgsqlDataSource dataSource)
{
    public async Task<object> PingAsync(CancellationToken cancellationToken = default)
    {
        var result = await dataSource.ExecuteScalarAsync<int>(
            "SELECT 1",
            cancellationToken: cancellationToken);
        return new { status = "healthy", result };
    }
}
