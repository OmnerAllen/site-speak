namespace SiteSpeak.Llm;

/// <summary>OpenAI-style function tool call from <c>choices[0].message.tool_calls[]</c>.</summary>
public sealed record LlmToolCall(string Id, string Name, string Arguments);
