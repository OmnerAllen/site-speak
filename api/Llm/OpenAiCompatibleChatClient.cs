using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
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

        var parsed = LlmCompletionParser.TryParse(body);
        if (parsed is null)
            return (null, "Language model response was not valid JSON or had no choices.");

        if (parsed.ToolCalls.Count > 0 && string.IsNullOrWhiteSpace(parsed.Content))
            return (null,
                "Language model returned tool_calls without plain text. Tool calling is handled on the server for material estimates; plain chat cannot process tool_calls.");

        if (parsed.ToolCalls.Count > 0)
            return (null,
                "Language model returned tool_calls. Tool calling is handled on the server for material estimates; plain chat cannot process tool_calls.");

        if (!string.IsNullOrWhiteSpace(parsed.Content))
            return (parsed.Content, null);

        return (null, "Language model returned empty message content.");
    }

    /// <inheritdoc />
    public async Task<(string RawBody, LlmChatCompletionResult? Parsed, string? Error)> PostChatCompletionsAsync(
        JsonElement requestBody,
        CancellationToken cancellationToken = default)
    {
        var url = _options.ChatCompletionsUrl.Trim();
        JsonObject payloadObj;
        try
        {
            payloadObj = MergeRequestWithModel(requestBody, _options.Model);
        }
        catch (JsonException ex)
        {
            return ("", null, $"Invalid request JSON: {ex.Message}");
        }

        if (!payloadObj.TryGetPropertyValue("messages", out var msgNode) || msgNode is null)
            return ("", null, "Request body must include a non-null \"messages\" array.");

        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Content = JsonContent.Create(payloadObj, options: new JsonSerializerOptions
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
            return ("", null,
                $"Could not reach the language model at {url}: {detail}. " +
                "Common causes: request body too large, server/proxy body limit, network drop mid-transfer, or timeout.");
        }

        var body = await res.Content.ReadAsStringAsync(cancellationToken);
        if (!res.IsSuccessStatusCode)
        {
            var snippet = body.Length > 400 ? body[..400] + "…" : body;
            return (body, null, $"Language model returned HTTP {(int)res.StatusCode}. Body: {snippet}");
        }

        var parsed = LlmCompletionParser.TryParse(body);
        if (parsed is null)
            return (body, null, "Language model response was not valid JSON or had no choices.");

        return (body, parsed, null);
    }

    private static JsonObject MergeRequestWithModel(JsonElement requestBody, string model)
    {
        var node = JsonNode.Parse(requestBody.GetRawText()) ?? throw new JsonException("Invalid JSON body.");
        if (node is not JsonObject obj)
            throw new JsonException("Request body must be a JSON object.");

        if (!obj.TryGetPropertyValue("model", out var existingModel) || existingModel is null ||
            (existingModel is JsonValue v && string.IsNullOrWhiteSpace(v.ToString())))
            obj["model"] = model;

        return obj;
    }
}
