namespace SiteSpeak.Geo;

public sealed class GeocodingOptions
{
    public const string SectionName = "Geocoding";

    /// <summary>Base URL without trailing slash, e.g. https://nominatim.openstreetmap.org</summary>
    public string BaseUrl { get; set; } = "https://nominatim.openstreetmap.org";

    /// <summary>Required by Nominatim usage policy (identify your app).</summary>
    public string UserAgent { get; set; } = "SiteSpeak/1.0";

    /// <summary>When true, skips HTTP and returns fixed coordinates (local dev without network).</summary>
    public bool DevBypass { get; set; }

    public double DevBypassLatitude { get; set; } = 40.2969;

    public double DevBypassLongitude { get; set; } = -111.6946;
}
