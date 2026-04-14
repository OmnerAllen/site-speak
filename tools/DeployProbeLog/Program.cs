using System.Text.Json;
using Microsoft.Extensions.Logging;
using OpenTelemetry.Exporter;
using OpenTelemetry.Logs;
using OpenTelemetry.Resources;

static int Usage()
{
    Console.Error.WriteLine("Usage: DeployProbeLog <ndjson-file>");
    Console.Error.WriteLine("Env: DEPLOY_PROBE_OTLP_LOGS_ENDPOINT (required, e.g. https://collector.example/v1/logs)");
    Console.Error.WriteLine("Env: GITHUB_RUN_ID, DEPLOY_PROBE_TARGET_URL (resource attributes)");
    return 2;
}

if (args.Length < 1)
    return Usage();

var logsUrl = Environment.GetEnvironmentVariable("DEPLOY_PROBE_OTLP_LOGS_ENDPOINT");
if (string.IsNullOrWhiteSpace(logsUrl))
{
    Console.Error.WriteLine("DEPLOY_PROBE_OTLP_LOGS_ENDPOINT is required.");
    return Usage();
}

var runId = Environment.GetEnvironmentVariable("GITHUB_RUN_ID") ?? "local";
var targetUrl = Environment.GetEnvironmentVariable("DEPLOY_PROBE_TARGET_URL") ?? "";

var inputPath = args[0];
if (!File.Exists(inputPath))
{
    Console.Error.WriteLine($"Input file not found: {inputPath}");
    return 1;
}

using var factory = LoggerFactory.Create(b =>
{
    b.SetMinimumLevel(LogLevel.Trace);
    b.AddOpenTelemetry(o =>
    {
        o.SetResourceBuilder(
            ResourceBuilder.CreateDefault()
                .AddService("DeploySyntheticProbe")
                .AddAttributes(new KeyValuePair<string, object>[]
                {
                    new("deployment.run.id", runId),
                    new("deploy.probe.target_url", targetUrl),
                }));
        o.AddOtlpExporter(e =>
        {
            e.Endpoint = new Uri(logsUrl);
            e.Protocol = OtlpExportProtocol.HttpProtobuf;
            e.HttpClientFactory = () => new HttpClient { Timeout = TimeSpan.FromMinutes(10) };
        });
    });
});

var logger = factory.CreateLogger("DeploySyntheticProbe");

var lineNumber = 0;
foreach (var line in File.ReadLines(inputPath))
{
    if (string.IsNullOrWhiteSpace(line))
        continue;
    lineNumber++;
    try
    {
        using var doc = JsonDocument.Parse(line);
        var root = doc.RootElement;
        var ok = root.TryGetProperty("ok", out var okEl) && okEl.GetBoolean();
        var statusCode = root.TryGetProperty("status_code", out var sc) ? sc.GetInt32() : 0;
        var latencyMs = root.TryGetProperty("latency_ms", out var lm) ? lm.GetDouble() : 0;
        var error = root.TryGetProperty("error", out var er) ? (er.GetString() ?? "") : "";
        var ts = root.TryGetProperty("ts", out var t) ? (t.GetString() ?? "") : "";

        if (ok)
        {
            logger.LogInformation(
                "deploy_probe_ok ts={probe_ts} status={http_status_code} latency_ms={probe_latency_ms}",
                ts,
                statusCode,
                latencyMs);
        }
        else
        {
            logger.LogWarning(
                "deploy_probe_fail ts={probe_ts} status={http_status_code} latency_ms={probe_latency_ms} error={probe_error}",
                ts,
                statusCode,
                latencyMs,
                error);
        }
    }
    catch (JsonException ex)
    {
        Console.Error.WriteLine($"Line {lineNumber}: invalid JSON: {ex.Message}");
        return 1;
    }
}

factory.Dispose();
Console.WriteLine($"Exported {lineNumber} probe lines to OTLP.");
return 0;
