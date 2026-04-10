using System.Text.Json;

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

    /// <summary>
    /// POST a chat completions body (must include <c>messages</c>). Injects <c>model</c> from config when missing.
    /// Returns the raw upstream JSON body and parsed first choice (content and/or tool calls).
    /// </summary>
    Task<(string RawBody, LlmChatCompletionResult? Parsed, string? Error)> PostChatCompletionsAsync(
        JsonElement requestBody,
        CancellationToken cancellationToken = default);
}
