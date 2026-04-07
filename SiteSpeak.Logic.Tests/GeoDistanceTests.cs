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
}
