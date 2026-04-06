namespace SiteSpeak.Logic.Tests;

public class TelemetryPagePathTests
{
    [Theory]
    [InlineData("/foo", "/foo")]
    [InlineData("  /bar  ", "/bar")]
    [InlineData("/a/b", "/a/b")]
    public void TryNormalize_accepts_valid_paths(string input, string expected)
    {
        Assert.True(TelemetryPagePath.TryNormalize(input, out var normalized));
        Assert.Equal(expected, normalized);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("foo")]
    [InlineData("/foo/../bar")]
    [InlineData("/foo..bar")]
    public void TryNormalize_rejects_invalid_paths(string? input)
    {
        Assert.False(TelemetryPagePath.TryNormalize(input, out _));
    }

    [Fact]
    public void TryNormalize_rejects_path_longer_than_256_chars()
    {
        var path = "/" + new string('a', 256);
        Assert.False(TelemetryPagePath.TryNormalize(path, out _));
    }
}
