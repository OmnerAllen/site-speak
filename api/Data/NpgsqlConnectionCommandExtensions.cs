using Npgsql;

public static class NpgsqlConnectionCommandExtensions
{
    public static NpgsqlCommand CreateConfiguredCommand(
        this NpgsqlConnection connection,
        string commandText,
        NpgsqlTransaction? transaction = null,
        Action<NpgsqlParameterCollection>? configureParameters = null)
    {
        var cmd = connection.CreateCommand();
        cmd.CommandText = commandText;
        cmd.Transaction = transaction;
        configureParameters?.Invoke(cmd.Parameters);
        return cmd;
    }

    public static Task<T?> ExecuteScalarAsync<T>(
        this NpgsqlConnection connection,
        string sql,
        NpgsqlTransaction? transaction = null,
        Action<NpgsqlParameterCollection>? configureParameters = null,
        bool isWrite = false,
        CancellationToken cancellationToken = default) =>
        SiteSpeakMetrics.ExecuteTimedAsync(isWrite, async () =>
        {
            await using var cmd = connection.CreateConfiguredCommand(sql, transaction, configureParameters);
            var result = await cmd.ExecuteScalarAsync(cancellationToken);
            if (result is null or DBNull) return default;
            return (T?)(object)result;
        });

    public static Task<int> ExecuteNonQueryAsync(
        this NpgsqlConnection connection,
        string sql,
        NpgsqlTransaction? transaction = null,
        Action<NpgsqlParameterCollection>? configureParameters = null,
        CancellationToken cancellationToken = default) =>
        SiteSpeakMetrics.ExecuteTimedAsync(true, async () =>
        {
            await using var cmd = connection.CreateConfiguredCommand(sql, transaction, configureParameters);
            return await cmd.ExecuteNonQueryAsync(cancellationToken);
        });

    public static Task<IReadOnlyList<T>> QueryAsync<T>(
        this NpgsqlConnection connection,
        string sql,
        Func<NpgsqlDataReader, T> mapRow,
        NpgsqlTransaction? transaction = null,
        Action<NpgsqlParameterCollection>? configureParameters = null,
        bool isWrite = false,
        CancellationToken cancellationToken = default) =>
        SiteSpeakMetrics.ExecuteTimedAsync(isWrite, async () =>
        {
            await using var cmd = connection.CreateConfiguredCommand(sql, transaction, configureParameters);
            var list = new List<T>();
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                list.Add(mapRow(reader));

            return (IReadOnlyList<T>)list;
        });

    public static Task<T?> QuerySingleOrDefaultAsync<T>(
        this NpgsqlConnection connection,
        string sql,
        Func<NpgsqlDataReader, T> mapRow,
        NpgsqlTransaction? transaction = null,
        Action<NpgsqlParameterCollection>? configureParameters = null,
        bool isWrite = false,
        CancellationToken cancellationToken = default) =>
        SiteSpeakMetrics.ExecuteTimedAsync(isWrite, async () =>
        {
            await using var cmd = connection.CreateConfiguredCommand(sql, transaction, configureParameters);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken)) return default;
            return mapRow(reader);
        });
}
