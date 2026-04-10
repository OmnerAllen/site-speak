namespace SiteSpeak.Llm;

/// <summary>First choice from a chat completions response (text and/or tool calls).</summary>
public sealed record LlmChatCompletionResult(
    string? Content,
    IReadOnlyList<LlmToolCall> ToolCalls,
    string? FinishReason);
