using System.Text.Json;
using Microsoft.Extensions.Options;
using SiteSpeak.Chat;
using SiteSpeak.Estimates;
using SiteSpeak.Geo;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});

builder.Services.Configure<MaterialEstimateOptions>(
    builder.Configuration.GetSection(MaterialEstimateOptions.SectionName));
builder.Services.Configure<GeocodingOptions>(
    builder.Configuration.GetSection(GeocodingOptions.SectionName));
builder.Services.AddHttpClient<IGeocoder, NominatimGeocoder>((sp, client) =>
{
    var o = sp.GetRequiredService<IOptions<GeocodingOptions>>().Value;
    client.BaseAddress = new Uri(o.BaseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(90);
});
builder.Services.AddHttpClient();
builder.Services.AddHttpClient("MaterialEstimateLlm", client =>
{
    // Large catalog JSON + slow upload over Tailscale + long inference can exceed the default 100s.
    client.Timeout = TimeSpan.FromMinutes(15);
});
builder.Services.AddSingleton<MaterialEstimateService>();
builder.Services.AddSingleton<AiChatService>();

builder.AddSiteSpeakTelemetry();
builder.AddSiteSpeakDatabase();
builder.AddSiteSpeakData();
builder.AddSiteSpeakAuth();

var app = builder.Build();

app.UseSiteSpeakAuth();

app.MapSiteSpeakEndpoints();

app.Run();
