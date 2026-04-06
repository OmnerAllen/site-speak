namespace SiteSpeak.Logic;

/// <summary>
/// Validates planned date strings for project stage schedule patches.
/// </summary>
public static class ScheduleStageValidation
{
    /// <summary>
    /// Returns true when both dates are non-empty, parse as dates, and start is after end (invalid range).
    /// Matches minimal API behavior: missing or unparseable dates do not trigger this error.
    /// </summary>
    public static bool IsPlannedRangeInvalid(string? plannedStartDate, string? plannedEndDate)
    {
        if (string.IsNullOrWhiteSpace(plannedStartDate) || string.IsNullOrWhiteSpace(plannedEndDate))
            return false;
        if (!DateOnly.TryParse(plannedStartDate, out var ds) || !DateOnly.TryParse(plannedEndDate, out var de))
            return false;
        return ds > de;
    }
}
