using Npgsql;

public class HealthRepository(NpgsqlDataSource dataSource)
{
    public async Task<object> PingAsync(CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT 1";
        var result = await cmd.ExecuteScalarAsync(cancellationToken);
        return new { status = "healthy", result };
    }
}
