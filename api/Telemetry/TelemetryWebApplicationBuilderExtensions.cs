using OpenTelemetry.Logs;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using OpenTelemetry.Metrics;

public static class TelemetryWebApplicationBuilderExtensions
{
    private const string ServiceName = "SiteSpeak";
    private const string OtlpBaseUrl = "http://otel-collector:4318";

    static bool OtelSdkDisabled()
    {
        var v = Environment.GetEnvironmentVariable("OTEL_SDK_DISABLED");
        return string.Equals(v, "true", StringComparison.OrdinalIgnoreCase)
            || v == "1";
    }

    public static WebApplicationBuilder AddSiteSpeakTelemetry(this WebApplicationBuilder builder)
    {
        if (OtelSdkDisabled())
        {
            builder.Logging.ClearProviders();
            builder.Logging.AddConsole();
            return builder;
        }

        builder.Logging.ClearProviders();
        builder.Logging.AddConsole();

        builder.Logging.AddOpenTelemetry(logging =>
        {
            logging.IncludeScopes = true;
            logging.IncludeFormattedMessage = true;
            logging.SetResourceBuilder(ResourceBuilder.CreateDefault().AddService(ServiceName));
            logging.AddOtlpExporter(options =>
            {
                options.Endpoint = new Uri($"{OtlpBaseUrl}/v1/logs");
                options.Protocol = OpenTelemetry.Exporter.OtlpExportProtocol.HttpProtobuf;
            });
        });

        builder.Services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(ServiceName))
            .WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation()
                .AddOtlpExporter(options =>
                {
                    options.Endpoint = new Uri($"{OtlpBaseUrl}/v1/traces");
                    options.Protocol = OpenTelemetry.Exporter.OtlpExportProtocol.HttpProtobuf;
                })
            )
            .WithMetrics(metrics => metrics
                .AddMeter(SiteSpeakMetrics.MeterName)
                .AddAspNetCoreInstrumentation()
                .AddOtlpExporter(options =>
                {
                    options.Endpoint = new Uri($"{OtlpBaseUrl}/v1/metrics");
                    options.Protocol = OpenTelemetry.Exporter.OtlpExportProtocol.HttpProtobuf;
                })
            );

        return builder;
    }
}
