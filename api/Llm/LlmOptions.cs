namespace SiteSpeak.Llm;

public class LlmOptions
{
    public const string SectionName = "Llm";

    /// <summary>
    /// OpenAI-compatible chat completions. Use <c>https://</c> when the listener speaks TLS;
    /// plain <c>http://</c> to an HTTPS-only port returns HTTP 400 (“HTTP request to an HTTPS server”).
    /// </summary>
    public string ChatCompletionsUrl { get; set; } =
        "https://ai-snow.reindeer-pinecone.ts.net:9292/v1/chat/completions";

    public string Model { get; set; } = "gemma4-31b";
}
