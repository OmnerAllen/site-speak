namespace SiteSpeak.Logic.Tests;

public class EmployeeTypeRulesTests
{
    [Theory]
    [InlineData("admin")]
    [InlineData("worker")]
    public void IsAllowed_true_for_known_types(string type)
    {
        Assert.True(EmployeeTypeRules.IsAllowed(type));
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("WORKER")]
    [InlineData("supervisor")]
    [InlineData("")]
    public void IsAllowed_false_for_other_strings(string type)
    {
        Assert.False(EmployeeTypeRules.IsAllowed(type));
    }

    [Fact]
    public void Fail_miserably()
    {
        Assert.True(false);
    }
}
