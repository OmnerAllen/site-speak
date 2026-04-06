namespace SiteSpeak.Logic;

public static class TelemetryPagePath
{
    public static bool TryNormalize(string? path, out string normalized)
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
