namespace SiteSpeak.Logic.Tests;

public class ScheduleStageValidationTests
{
    [Theory]
    [InlineData("2024-01-01", "2024-01-01", false)]
    [InlineData("2024-01-01", "2024-01-02", false)]
    [InlineData("2024-01-02", "2024-01-01", true)]
    public void IsPlannedRangeInvalid_matches_date_order(string start, string end, bool expectInvalid)
    {
        Assert.Equal(expectInvalid, ScheduleStageValidation.IsPlannedRangeInvalid(start, end));
    }

    [Theory]
    [InlineData(null, "2024-01-01")]
    [InlineData("", "2024-01-01")]
    [InlineData("   ", "2024-01-01")]
    [InlineData("2024-01-01", null)]
    [InlineData("2024-01-01", "")]
    [InlineData("2024-01-01", "   ")]
    public void IsPlannedRangeInvalid_false_when_either_date_missing(string? start, string? end)
    {
        Assert.False(ScheduleStageValidation.IsPlannedRangeInvalid(start, end));
    }

    [Theory]
    [InlineData("not-a-date", "2024-01-01")]
    [InlineData("2024-01-01", "not-a-date")]
    public void IsPlannedRangeInvalid_false_when_parse_fails(string start, string end)
    {
        Assert.False(ScheduleStageValidation.IsPlannedRangeInvalid(start, end));
    }
}
