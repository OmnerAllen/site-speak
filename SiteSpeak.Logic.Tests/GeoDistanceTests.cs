using SiteSpeak.Logic;

namespace SiteSpeak.Logic.Tests;

public class GeoDistanceTests
{
    [Fact]
    public void MilesBetween_SamePoint_IsZero()
    {
        Assert.Equal(0, GeoDistance.MilesBetween(40.7, -74.0, 40.7, -74.0), 6);
    }

    [Fact]
    public void MilesBetween_LosAngelesToSanFrancisco_IsRoughlyExpected()
    {
        var miles = GeoDistance.MilesBetween(34.05, -118.25, 37.77, -122.42);
        Assert.InRange(miles, 330, 370);
    }

    [Fact]
    public void MilesBetween_ShortSpan_IsWithinSmallRadius()
    {
        var jobLat = 40.2969;
        var jobLon = -111.6946;
        var nearLat = 40.30;
        var nearLon = -111.70;
        var miles = GeoDistance.MilesBetween(jobLat, jobLon, nearLat, nearLon);
        Assert.True(miles < 5, $"Expected < 5 mi, got {miles}");
    }
}
