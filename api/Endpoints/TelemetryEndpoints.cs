using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

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

        app.MapPost("/telemetry/client-error", (ClientErrorBody body, ILogger<Program> logger) =>
        {
            logger.LogError("Client UI Error: {Message}. URL: {Url}. StackTrace: {StackTrace}", 
                body.Message, body.Url, body.StackTrace);
            return Results.NoContent();
        }).AllowAnonymous();

        app.MapPost("/telemetry/client-toast", (ClientToastBody body, ILogger<Program> logger, System.Security.Claims.ClaimsPrincipal user) =>
        {
            var email = user?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "Anonymous";
            logger.LogWarning("Client UI Toast displayed for user {User}: [{Type}] {Message}", 
                email, body.Type ?? "Info", body.Message);
            return Results.NoContent();
        }).AllowAnonymous();

        app.MapPost("/telemetry/client-login", (ILogger<Program> logger, System.Security.Claims.ClaimsPrincipal user) =>
        {
            var email = user?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value 
                        ?? user?.FindFirst("preferred_username")?.Value 
                        ?? "Unknown user";
            logger.LogInformation("User logged in explicitly from client: {User}", email);
            return Results.NoContent();
        }).RequireAuthorization();

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

public sealed record ClientErrorBody(
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("url")] string? Url,
    [property: JsonPropertyName("stackTrace")] string? StackTrace);

public sealed record ClientToastBody(
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("type")] string? Type);
