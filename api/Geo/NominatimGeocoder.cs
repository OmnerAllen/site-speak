using System.Text.Json;
using Microsoft.Extensions.Options;

namespace SiteSpeak.Geo;

public sealed class NominatimGeocoder : IGeocoder
{
    private readonly HttpClient _http;
    private readonly GeocodingOptions _options;

    public NominatimGeocoder(HttpClient http, IOptions<GeocodingOptions> options)
    {
        _http = http;
        _options = options.Value;
    }

    public async Task<GeocodePoint?> GeocodeAsync(string address, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(address))
            return null;

        if (_options.DevBypass)
            return new GeocodePoint(_options.DevBypassLatitude, _options.DevBypassLongitude);

        var q = Uri.EscapeDataString(address.Trim());
        using var res = await _http.GetAsync($"search?q={q}&format=json&limit=1&addressdetails=0", cancellationToken);
        if (!res.IsSuccessStatusCode)
            return null;

        await using var stream = await res.Content.ReadAsStreamAsync(cancellationToken);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        if (doc.RootElement.ValueKind != JsonValueKind.Array || doc.RootElement.GetArrayLength() == 0)
            return null;

        var first = doc.RootElement[0];
        if (!first.TryGetProperty("lat", out var latEl) || !first.TryGetProperty("lon", out var lonEl))
            return null;

        if (!double.TryParse(latEl.GetString(), System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out var lat))
            return null;
        if (!double.TryParse(lonEl.GetString(), System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out var lon))
            return null;

        return new GeocodePoint(lat, lon);
    }
}
