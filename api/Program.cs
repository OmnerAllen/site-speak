using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using SiteSpeak.Chat;
using SiteSpeak.Estimates;
using SiteSpeak.Features;
using SiteSpeak.Geo;
using SiteSpeak.Llm;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
});

builder.Services.Configure<LlmOptions>(
    builder.Configuration.GetSection(LlmOptions.SectionName));
builder.Services.Configure<MaterialEstimateOptions>(
    builder.Configuration.GetSection(MaterialEstimateOptions.SectionName));
builder.Services.Configure<GeocodingOptions>(
    builder.Configuration.GetSection(GeocodingOptions.SectionName));
builder.Services.Configure<FeaturesOptions>(
    builder.Configuration.GetSection(FeaturesOptions.SectionName));
builder.Services.AddHttpClient<IGeocoder, NominatimGeocoder>((sp, client) =>
{
    var o = sp.GetRequiredService<IOptions<GeocodingOptions>>().Value;
    client.BaseAddress = new Uri(o.BaseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(90);
});
builder.Services.AddHttpClient();
builder.Services.AddHttpClient(OpenAiCompatibleChatClient.HttpClientName, client =>
{
    // Large catalog JSON + slow upload over Tailscale + long inference can exceed the default 100s.
    client.Timeout = TimeSpan.FromMinutes(15);
});
builder.Services.AddSingleton<ILlmChatClient, OpenAiCompatibleChatClient>();
builder.Services.AddHttpClient<IWhisperClient, SiteSpeak.Llm.AiOfficeWhisperClient>((sp, client) =>
{
    var url = Environment.GetEnvironmentVariable("Llm__WhisperUrl") ?? throw new Exception("Whisper URL not configured");
    Console.WriteLine($"[Program] Configuring WhisperClient with URL: {url}");
    client.BaseAddress = new Uri(url);
});
builder.Services.AddSingleton<MaterialEstimateService>();
builder.Services.AddSingleton<AiChatService>();

builder.AddSiteSpeakTelemetry();
builder.AddSiteSpeakDatabase();
builder.AddSiteSpeakData();
builder.AddSiteSpeakAuth();

var app = builder.Build();


app.UseSiteSpeakAuth();



app.Use(async (context, next) =>
{
    string email = context.User.Claims.FirstOrDefault(c => c.Type == "email")?.Value ?? "email not found ;)";

    try
    {
        await next.Invoke(context);
        Console.WriteLine($"[{email}]: {context.Response.StatusCode} {context.Request.Method} {context.Request.Path}");
    }
    catch (ToolCallArgumentsParsingException ex)
    {
        Console.WriteLine($"[{email}]: Tool call arguments parsing error: {ex.Message}");
        context.Response.StatusCode = 400;
        await context.Response.WriteAsJsonAsync(new { error = ex.Message });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[{email}]: Unhandled exception: {ex}");
        context.Response.StatusCode = 500;
        await context.Response.WriteAsJsonAsync(new { error = "An unexpected error occurred." });
    }
    
    
});

app.MapSiteSpeakEndpoints();

app.Run();

public partial class Program;
