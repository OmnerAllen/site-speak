using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace SiteSpeak.Llm;

public sealed class OpenAiCompatibleChatClient(
    IHttpClientFactory httpClientFactory,
    IOptions<LlmOptions> options) : ILlmChatClient
{
    public const string HttpClientName = "Llm";

    private readonly LlmOptions _options = options.Value;

    private HttpClient Http => httpClientFactory.CreateClient(HttpClientName);

    /// <inheritdoc />
    public async Task<(string? Content, string? Error)> CompleteAsync(
        IReadOnlyList<LlmChatMessage> messages,
        bool jsonObjectResponse,
        CancellationToken cancellationToken = default)
    {
        var url = _options.ChatCompletionsUrl.Trim();
        var messageBodies = messages.Select(m => new { role = m.Role, content = m.Content }).ToList();
        object payload = jsonObjectResponse
            ? new
            {
                model = _options.Model,
                messages = messageBodies,
                response_format = new { type = "json_object" },
            }
            : new { model = _options.Model, messages = messageBodies };

        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Content = JsonContent.Create(payload, options: new JsonSerializerOptions
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        });

        HttpResponseMessage res;
        try
        {
            res = await Http.SendAsync(req, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or IOException)
        {
            var detail = ex.InnerException?.Message is { } inner ? $"{ex.Message} ({inner})" : ex.Message;
            return (null,
                $"Could not reach the language model at {url}: {detail}. " +
                "Common causes: request body too large, server/proxy body limit, network drop mid-transfer, or timeout.");
        }

        var body = await res.Content.ReadAsStringAsync(cancellationToken);
        if (!res.IsSuccessStatusCode)
        {
            var snippet = body.Length > 400 ? body[..400] + "…" : body;
            return (null, $"Language model returned HTTP {(int)res.StatusCode}. Body: {snippet}");
        }

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(body);
        }
        catch (JsonException ex)
        {
            return (null, $"Language model response was not valid JSON: {ex.Message}");
        }

        using (doc)
        {
            if (!doc.RootElement.TryGetProperty("choices", out var choices) || choices.GetArrayLength() == 0)
            {
                var snippet = body.Length > 400 ? body[..400] + "…" : body;
                return (null, $"Language model JSON had no choices[] (unexpected shape). Snippet: {snippet}");
            }

            var first = choices[0];
            if (!first.TryGetProperty("message", out var message))
                return (null, "Language model response: choices[0] missing message.");

            if (message.TryGetProperty("content", out var contentEl))
            {
                var text = contentEl.GetString();
                if (!string.IsNullOrWhiteSpace(text))
                    return (text, null);

                return (null, "Language model returned empty message content.");
            }

            return (null, "Language model response: message missing content (some servers use a different schema).");
        }
    }
}
