using System.Text.Json;
using SiteSpeak.Llm;

namespace SiteSpeak.Chat;

public sealed class AiChatService(ILlmChatClient llm)
{
    private const int MaxMessages = 40;
    private const int MaxCharsPerMessage = 32_000;
    private const int MaxCompletionsMessages = 80;
    private const int MaxCompletionsBodyChars = 2_000_000;

    /// <summary>Plain chat completions (small JSON body — no material/equipment catalogs).</summary>
    public async Task<(string? Reply, string? Error)> ChatAsync(
        IReadOnlyList<AiChatMessageBody> messages,
        CancellationToken cancellationToken)
    {
        if (messages.Count == 0)
            return (null, "At least one message is required.");

        if (messages.Count > MaxMessages)
            return (null, $"At most {MaxMessages} messages are allowed.");

        var normalized = new List<LlmChatMessage>(messages.Count);
        foreach (var m in messages)
        {
            var role = NormalizeRole(m.Role);
            if (role is null)
                return (null, $"Invalid role: {m.Role}. Use system, user, or assistant.");

            var content = m.Content ?? "";
            if (content.Length > MaxCharsPerMessage)
                return (null, $"Each message must be at most {MaxCharsPerMessage} characters.");

            normalized.Add(new LlmChatMessage(role, content));
        }

        return await llm.CompleteAsync(normalized, jsonObjectResponse: false, cancellationToken);
    }

    /// <summary>Raw chat completions for tool-calling loops (forwards JSON body to the LLM).</summary>
    public Task<(string RawBody, LlmChatCompletionResult? Parsed, string? Error)> CompletionsAsync(
        JsonElement requestBody,
        CancellationToken cancellationToken = default)
    {
        if (requestBody.ValueKind != JsonValueKind.Object)
            return Task.FromResult<(string, LlmChatCompletionResult?, string?)>(("", null, "Body must be a JSON object."));

        if (!requestBody.TryGetProperty("messages", out var msgEl) || msgEl.ValueKind != JsonValueKind.Array)
            return Task.FromResult<(string, LlmChatCompletionResult?, string?)>(("", null, "\"messages\" must be a JSON array."));

        if (msgEl.GetArrayLength() == 0)
            return Task.FromResult<(string, LlmChatCompletionResult?, string?)>(("", null, "At least one message is required."));

        if (msgEl.GetArrayLength() > MaxCompletionsMessages)
            return Task.FromResult<(string, LlmChatCompletionResult?, string?)>(
                ("", null, $"At most {MaxCompletionsMessages} messages are allowed."));

        if (requestBody.GetRawText().Length > MaxCompletionsBodyChars)
            return Task.FromResult<(string, LlmChatCompletionResult?, string?)>(("", null, "Request body too large."));

        return llm.PostChatCompletionsAsync(requestBody, cancellationToken);
    }

    private static string? NormalizeRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role)) return null;
        return role.Trim().ToLowerInvariant() switch
        {
            "system" => "system",
            "user" => "user",
            "assistant" => "assistant",
            _ => null,
        };
    }
}
