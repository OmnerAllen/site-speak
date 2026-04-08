namespace SiteSpeak.Geo;

public readonly record struct GeocodePoint(double Latitude, double Longitude);

public interface IGeocoder
{
    /// <summary>Returns null if the address could not be resolved.</summary>
    Task<GeocodePoint?> GeocodeAsync(string address, CancellationToken cancellationToken = default);
}
