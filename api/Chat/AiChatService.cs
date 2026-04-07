using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using SiteSpeak.Estimates;

namespace SiteSpeak.Chat;

public sealed class AiChatService(
    IHttpClientFactory httpClientFactory,
    IOptions<MaterialEstimateOptions> options)
{
    private const int MaxMessages = 40;
    private const int MaxCharsPerMessage = 32_000;

    private readonly MaterialEstimateOptions _options = options.Value;

    private HttpClient Http => httpClientFactory.CreateClient("MaterialEstimateLlm");

    /// <summary>Plain chat completions (small JSON body — no material/equipment catalogs).</summary>
    public async Task<(string? Reply, string? Error)> ChatAsync(
        IReadOnlyList<AiChatMessageBody> messages,
        CancellationToken cancellationToken)
    {
        if (messages.Count == 0)
            return (null, "At least one message is required.");

        if (messages.Count > MaxMessages)
            return (null, $"At most {MaxMessages} messages are allowed.");

        var normalized = new List<object>(messages.Count);
        foreach (var m in messages)
        {
            var role = NormalizeRole(m.Role);
            if (role is null)
                return (null, $"Invalid role: {m.Role}. Use system, user, or assistant.");

            var content = m.Content ?? "";
            if (content.Length > MaxCharsPerMessage)
                return (null, $"Each message must be at most {MaxCharsPerMessage} characters.");

            normalized.Add(new { role, content });
        }

        var url = _options.ChatCompletionsUrl.Trim();
        var payload = new
        {
            model = _options.Model,
            messages = normalized,
        };

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
            return (null, $"Could not reach the language model: {detail}");
        }

        var body = await res.Content.ReadAsStringAsync(cancellationToken);
        if (!res.IsSuccessStatusCode)
        {
            var snippet = body.Length > 400 ? body[..400] + "…" : body;
            return (null, $"Language model returned HTTP {(int)res.StatusCode}. {snippet}");
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
                return (null, $"Unexpected response (no choices). Snippet: {snippet}");
            }

            var first = choices[0];
            if (!first.TryGetProperty("message", out var message))
                return (null, "Response missing message.");

            if (message.TryGetProperty("content", out var contentEl))
            {
                var text = contentEl.GetString();
                return (text ?? "", null);
            }

            return (null, "Response message missing content.");
        }
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
