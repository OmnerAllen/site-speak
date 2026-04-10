using SiteSpeak.Llm;

namespace SiteSpeak.Chat;

public sealed class AiChatService(ILlmChatClient llm)
{
    private const int MaxMessages = 40;
    private const int MaxCharsPerMessage = 32_000;

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
