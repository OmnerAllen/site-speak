namespace SiteSpeak.Estimates;

public class MaterialEstimateOptions
{
    public const string SectionName = "MaterialEstimate";

    /// <summary>
    /// When true and the host environment is Development, material-estimate responses include
    /// <c>LlmRawContent</c> (the model message text) for debugging parse issues.
    /// </summary>
    public bool IncludeLlmRawContentInResponse { get; set; }
}
