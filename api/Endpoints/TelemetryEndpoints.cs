using System.Text.Json.Serialization;

public static class TelemetryEndpoints
{
    public static WebApplication MapTelemetryEndpoints(this WebApplication app)
    {
        app.MapPost("/telemetry/page-view", (PageViewBody body) =>
        {
            if (!TryNormalizePage(body.Page, out var page))
                return Results.BadRequest();

            if (string.Equals(body.Kind, "first_load", StringComparison.OrdinalIgnoreCase))
            {
                SiteSpeakMetrics.PageFirstLoadTotal.Add(1, new KeyValuePair<string, object?>("page", page));
                return Results.NoContent();
            }

            if (string.Equals(body.Kind, "navigation", StringComparison.OrdinalIgnoreCase))
            {
                SiteSpeakMetrics.PageNavigationTotal.Add(1, new KeyValuePair<string, object?>("page", page));
                return Results.NoContent();
            }

            return Results.BadRequest();
        }).AllowAnonymous();

        return app;
    }

    private static bool TryNormalizePage(string? path, out string normalized)
    {
        normalized = "";
        if (string.IsNullOrWhiteSpace(path))
            return false;

        path = path.Trim();
        if (path.Length > 256 || !path.StartsWith('/'))
            return false;
        if (path.Contains("..", StringComparison.Ordinal))
            return false;

        normalized = path;
        return true;
    }
}

public sealed record PageViewBody(
    [property: JsonPropertyName("kind")] string Kind,
    [property: JsonPropertyName("page")] string Page);
