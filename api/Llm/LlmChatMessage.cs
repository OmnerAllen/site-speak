namespace SiteSpeak.Llm;

/// <param name="Role">OpenAI-style role: system, user, or assistant.</param>
public readonly record struct LlmChatMessage(string Role, string Content);
