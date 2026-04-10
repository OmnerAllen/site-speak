using SiteSpeak.Llm;

namespace SiteSpeak.Logic.Tests;

public class LlmCompletionParserTests
{
    [Fact]
    public void TryParse_TextOnly_ReturnsContent()
    {
        const string json = """
            {"choices":[{"index":0,"message":{"role":"assistant","content":"Hello"},"finish_reason":"stop"}]}
            """;
        var r = LlmCompletionParser.TryParse(json);
        Assert.NotNull(r);
        Assert.Equal("Hello", r.Content);
        Assert.Empty(r.ToolCalls);
    }

    [Fact]
    public void TryParse_ToolCalls_EmptyContent_ReturnsToolCalls()
    {
        const string json = """
            {"choices":[{"index":0,"message":{"role":"assistant","content":"","tool_calls":[{"id":"c1","type":"function","function":{"name":"submit_material_estimate","arguments":"{\"stages\":[]}"}}]},"finish_reason":"tool_calls"}]}
            """;
        var r = LlmCompletionParser.TryParse(json);
        Assert.NotNull(r);
        Assert.Single(r.ToolCalls);
        Assert.Equal("c1", r.ToolCalls[0].Id);
        Assert.Equal("submit_material_estimate", r.ToolCalls[0].Name);
        Assert.Contains("stages", r.ToolCalls[0].Arguments);
    }
}
