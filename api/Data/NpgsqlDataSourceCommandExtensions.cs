using Npgsql;

public static class NpgsqlDataSourceCommandExtensions
{
    public static Task<T?> ExecuteScalarAsync<T>(
        this NpgsqlDataSource dataSource,
        string sql,
        Action<NpgsqlParameterCollection>? configureParameters = null,
        bool isWrite = false,
        CancellationToken cancellationToken = default) =>
        SiteSpeakMetrics.ExecuteTimedAsync(isWrite, async () =>
        {
            await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            configureParameters?.Invoke(cmd.Parameters);
            var result = await cmd.ExecuteScalarAsync(cancellationToken);
            if (result is null or DBNull) return default;
            return (T?)(object)result;
        });

    public static Task<int> ExecuteNonQueryAsync(
        this NpgsqlDataSource dataSource,
        string sql,
        Action<NpgsqlParameterCollection>? configureParameters = null,
        CancellationToken cancellationToken = default) =>
        SiteSpeakMetrics.ExecuteTimedAsync(true, async () =>
        {
            await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            configureParameters?.Invoke(cmd.Parameters);
            return await cmd.ExecuteNonQueryAsync(cancellationToken);
        });

    public static Task<IReadOnlyList<T>> QueryAsync<T>(
        this NpgsqlDataSource dataSource,
        string sql,
        Func<NpgsqlDataReader, T> mapRow,
        Action<NpgsqlParameterCollection>? configureParameters = null,
        bool isWrite = false,
        CancellationToken cancellationToken = default) =>
        SiteSpeakMetrics.ExecuteTimedAsync(isWrite, async () =>
        {
            await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            configureParameters?.Invoke(cmd.Parameters);

            var list = new List<T>();
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                list.Add(mapRow(reader));

            return (IReadOnlyList<T>)list;
        });

    public static Task<T?> QuerySingleOrDefaultAsync<T>(
        this NpgsqlDataSource dataSource,
        string sql,
        Func<NpgsqlDataReader, T> mapRow,
        Action<NpgsqlParameterCollection>? configureParameters = null,
        bool isWrite = false,
        CancellationToken cancellationToken = default) =>
        SiteSpeakMetrics.ExecuteTimedAsync(isWrite, async () =>
        {
            await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            configureParameters?.Invoke(cmd.Parameters);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken)) return default;
            return mapRow(reader);
        });
}
