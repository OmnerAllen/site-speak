namespace SiteSpeak.Llm;

public interface ILlmChatClient
{
    /// <summary>
    /// POST to the configured OpenAI-compatible chat completions endpoint and return the first assistant message text.
    /// </summary>
    /// <param name="jsonObjectResponse">When true, sends <c>response_format: json_object</c> (supported by many OpenAI-compatible servers).</param>
    Task<(string? Content, string? Error)> CompleteAsync(
        IReadOnlyList<LlmChatMessage> messages,
        bool jsonObjectResponse,
        CancellationToken cancellationToken = default);
}
