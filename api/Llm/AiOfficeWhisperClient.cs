using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using System.IO;
using System.Text.Json;

namespace SiteSpeak.Llm;

public class AiOfficeWhisperClient : IWhisperClient
{
    private readonly HttpClient _httpClient;

    public AiOfficeWhisperClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<string> TranscribeAudioAsync(Stream audioStream, string filename, string language = "", string prompt = "", CancellationToken cancellationToken = default)
    {
        if (audioStream.CanSeek) audioStream.Position = 0;

        var boundary = System.Guid.NewGuid().ToString();
        using var multipart = new MultipartFormDataContent(boundary);
        multipart.Headers.Remove("Content-Type");
        multipart.Headers.TryAddWithoutValidation("Content-Type", $"multipart/form-data; boundary={boundary}");

        var fileContent = new StreamContent(audioStream);
        var mime = Path.GetExtension(filename).ToLowerInvariant() switch
        {
            ".mp3" => "audio/mpeg", ".wav" => "audio/wav", ".webm" => "audio/webm",
            ".m4a" => "audio/mp4", _ => "application/octet-stream"
        };
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(mime);
        fileContent.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data") { Name = "\"file\"", FileName = $"\"{filename}\"" };
        multipart.Add(fileContent);

        AddText(multipart, "response_format", "json");
        AddText(multipart, "language", language);
        AddText(multipart, "prompt", prompt);

        Console.WriteLine($"[AiOfficeWhisper] Audio stream length: {audioStream.Length} bytes.");
        Console.WriteLine($"[AiOfficeWhisper] Sending POST request to {_httpClient.BaseAddress}inference");
        
        var response = await _httpClient.PostAsync("/inference", multipart, cancellationToken);
        
        Console.WriteLine($"[AiOfficeWhisper] Received HTTP {response.StatusCode}");

        var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

        Console.WriteLine($"[AiOfficeWhisper] raw whisper response: {responseContent}");
        
        if (!response.IsSuccessStatusCode)
        {
            Console.WriteLine($"[AiOfficeWhisper] Warning: API returned non-success code! {responseContent}");
        }

        var result = JsonSerializer.Deserialize<WhisperResponse>(responseContent, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });   
        return result?.text ?? throw new Exception("Failed to parse transcription response");
    }

    private static void AddText(MultipartFormDataContent multipart, string name, string value)
    {
        if (string.IsNullOrEmpty(value) || value == "auto") return;
        var content = new StringContent(value);
        content.Headers.ContentType = null;
        content.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data") { Name = $"\"{name}\"" };
        multipart.Add(content);
    }
    
    private class WhisperResponse
    {
        public string text { get; set; } = string.Empty;
    }
}
