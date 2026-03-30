using System.Diagnostics;
using System.Diagnostics.Metrics;

static class SiteSpeakMetrics
{
    public const string MeterName = "SiteSpeak";
    public static readonly Meter Meter = new(MeterName);

    /// <summary>Client-side round-trip duration in seconds (OTel semantic convention name).</summary>
    public static readonly Histogram<double> DbClientOperationDuration = Meter.CreateHistogram<double>(
        "db.client.operation.duration",
        unit: "s",
        description: "Wall-clock duration from sending a DB operation until completion on the client.");

    /// <summary>Full browser document loads landing on a route (label: page).</summary>
    public static readonly Counter<long> PageFirstLoadTotal = Meter.CreateCounter<long>(
        "sitespeak.page.first_load",
        unit: "1",
        description: "Count of full page loads (SPA shell) per landing route.");

    /// <summary>Client-side SPA navigations after the initial load (label: page).</summary>
    public static readonly Counter<long> PageNavigationTotal = Meter.CreateCounter<long>(
        "sitespeak.page.navigation",
        unit: "1",
        description: "Count of in-app route changes per destination route.");

    public static void RegisterUsersByCompanyGauge(Func<IEnumerable<Measurement<long>>> observeValues)
    {
        Meter.CreateObservableGauge(
            "users.by_company",
            observeValues,
            unit: "1",
            description: "Number of users per company (label: company.id).");
    }

    public static async Task<T> ExecuteTimedAsync<T>(bool isWrite, Func<Task<T>> action)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            return await action();
        }
        finally
        {
            DbClientOperationDuration.Record(
                sw.Elapsed.TotalSeconds,
                new KeyValuePair<string, object?>("db.system", "postgresql"),
                new KeyValuePair<string, object?>("db.operation.type", isWrite ? "write" : "read"));
        }
    }
}
