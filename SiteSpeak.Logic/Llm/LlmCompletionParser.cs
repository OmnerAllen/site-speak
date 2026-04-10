using System.Text.Json;

namespace SiteSpeak.Llm;

/// <summary>Parses OpenAI-compatible <c>/v1/chat/completions</c> JSON bodies.</summary>
public static class LlmCompletionParser
{
    public static LlmChatCompletionResult? TryParse(string body)
    {
        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(body);
        }
        catch (JsonException)
        {
            return null;
        }

        using (doc)
        {
            if (!doc.RootElement.TryGetProperty("choices", out var choices) || choices.GetArrayLength() == 0)
                return null;

            var first = choices[0];
            var finishReason = first.TryGetProperty("finish_reason", out var frEl)
                ? frEl.GetString()
                : null;

            if (!first.TryGetProperty("message", out var message))
                return null;

            string? content = null;
            if (message.TryGetProperty("content", out var contentEl))
            {
                if (contentEl.ValueKind == JsonValueKind.String)
                    content = contentEl.GetString();
            }

            var toolCalls = new List<LlmToolCall>();
            if (message.TryGetProperty("tool_calls", out var tcEl) && tcEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var tc in tcEl.EnumerateArray())
                {
                    var id = tc.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "";
                    if (!tc.TryGetProperty("function", out var fnEl)) continue;
                    var name = fnEl.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "" : "";
                    var args = fnEl.TryGetProperty("arguments", out var argsEl)
                        ? argsEl.ValueKind == JsonValueKind.String
                            ? argsEl.GetString() ?? ""
                            : argsEl.GetRawText()
                        : "";
                    if (!string.IsNullOrEmpty(name))
                        toolCalls.Add(new LlmToolCall(id, name, args));
                }
            }

            return new LlmChatCompletionResult(content, toolCalls, finishReason);
        }
    }
}
