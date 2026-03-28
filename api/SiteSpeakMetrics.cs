using System.Diagnostics.Metrics;

static class SiteSpeakMetrics
{
    public const string MeterName = "SiteSpeak";
    public static readonly Meter Meter = new(MeterName);
}
