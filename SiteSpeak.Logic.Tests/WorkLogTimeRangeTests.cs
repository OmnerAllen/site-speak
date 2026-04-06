namespace SiteSpeak.Logic.Tests;

public class WorkLogTimeRangeTests
{
    [Fact]
    public void IsValid_true_when_started_before_ended()
    {
        var start = new DateTime(2024, 1, 1, 9, 0, 0, DateTimeKind.Utc);
        var end = new DateTime(2024, 1, 1, 17, 0, 0, DateTimeKind.Utc);
        Assert.True(WorkLogTimeRange.IsValid(start, end));
    }

    [Fact]
    public void IsValid_false_when_started_equals_ended()
    {
        var t = new DateTime(2024, 1, 1, 12, 0, 0, DateTimeKind.Utc);
        Assert.False(WorkLogTimeRange.IsValid(t, t));
    }

    [Fact]
    public void IsValid_false_when_started_after_ended()
    {
        var start = new DateTime(2024, 1, 1, 17, 0, 0, DateTimeKind.Utc);
        var end = new DateTime(2024, 1, 1, 9, 0, 0, DateTimeKind.Utc);
        Assert.False(WorkLogTimeRange.IsValid(start, end));
    }
}
