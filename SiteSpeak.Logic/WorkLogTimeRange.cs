namespace SiteSpeak.Logic;

public static class WorkLogTimeRange
{
    /// <summary>
    /// Work logs require started strictly before ended (same as repository guard).
    /// </summary>
    public static bool IsValid(DateTime startedAt, DateTime endedAt) => startedAt < endedAt;
}
