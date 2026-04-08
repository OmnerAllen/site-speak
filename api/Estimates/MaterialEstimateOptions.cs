namespace SiteSpeak.Estimates;

public class MaterialEstimateOptions
{
    public const string SectionName = "MaterialEstimate";

    /// <summary>
    /// OpenAI-compatible chat completions. Use <c>https://</c> when the listener on :9292 speaks TLS;
    /// plain <c>http://</c> to an HTTPS-only port returns HTTP 400 (“HTTP request to an HTTPS server”).
    /// </summary>
    public string ChatCompletionsUrl { get; set; } =
        "http://ai-snow.reindeer-pinecone.ts.net:9292/v1/chat/completions";

    public string Model { get; set; } = "gemma4-31b";

    /// <summary>
    /// When true and the host environment is Development, material-estimate responses include
    /// <c>LlmRawContent</c> (the model message text) for debugging parse issues.
    /// </summary>
    public bool IncludeLlmRawContentInResponse { get; set; }
}
