namespace SiteSpeak.Llm;

public class LlmOptions
{
    public const string SectionName = "Llm";

    /// <summary>Default OpenAI-compatible <c>model</c> id — change here only unless overridden via configuration.</summary>
    public const string DefaultModelId = "qwen3.5-122b";

    /// <summary>
    /// OpenAI-compatible chat completions. Use <c>https://</c> when the listener speaks TLS;
    /// plain <c>http://</c> to an HTTPS-only port returns HTTP 400 (“HTTP request to an HTTPS server”).
    /// </summary>
    public string ChatCompletionsUrl { get; set; } =
        "https://ai-snow.reindeer-pinecone.ts.net:9292/v1/chat/completions";

    public string Model { get; set; } = DefaultModelId;
}
