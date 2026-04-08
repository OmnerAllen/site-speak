namespace SiteSpeak.Features;

public class FeaturesOptions
{
    public const string SectionName = "Features";

    /// <summary>When false, POST /my/ai/chat returns 403.</summary>
    public bool AiChatEnabled { get; set; } = true;
}
