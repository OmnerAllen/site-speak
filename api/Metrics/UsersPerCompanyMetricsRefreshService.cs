public sealed class UsersPerCompanyMetricsRefreshService : BackgroundService
{
    static readonly TimeSpan Interval = TimeSpan.FromSeconds(60);

    readonly UsersPerCompanyMetricState _state;
    readonly UserRepository _users;
    readonly ILogger<UsersPerCompanyMetricsRefreshService> _logger;

    public UsersPerCompanyMetricsRefreshService(
        UsersPerCompanyMetricState state,
        UserRepository users,
        ILogger<UsersPerCompanyMetricsRefreshService> logger)
    {
        _state = state;
        _users = users;
        _logger = logger;
        SiteSpeakMetrics.RegisterUsersByCompanyGauge(state.Observe);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RefreshAsync(stoppingToken);
        using var timer = new PeriodicTimer(Interval);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
                await RefreshAsync(stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
    }

    async Task RefreshAsync(CancellationToken ct)
    {
        try
        {
            var rows = await _users.GetUserCountsByCompanyAsync(ct);
            _state.SetSnapshot(rows);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to refresh users.by_company metric snapshot");
        }
    }
}
