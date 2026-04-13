using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using System.IO;

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
        using var content = new MultipartFormDataContent();
        
        var streamContent = new StreamContent(audioStream);
        streamContent.Headers.ContentType = new MediaTypeHeaderValue("audio/webm");
        content.Add(streamContent, "file", filename);
        
        content.Add(new StringContent("json"), "response_format");
        
        if (!string.IsNullOrEmpty(language) && language != "auto")
            content.Add(new StringContent(language), "language");
            
        if (!string.IsNullOrEmpty(prompt))
            content.Add(new StringContent(prompt), "prompt");

        var response = await _httpClient.PostAsync("/inference", content, cancellationToken);
        
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException($"Whisper API error: {response.StatusCode} - {error}");
        }
        
        var result = await response.Content.ReadFromJsonAsync<WhisperResponse>(cancellationToken: cancellationToken);
        return result?.text ?? string.Empty;
    }
    
    private class WhisperResponse
    {
        public string text { get; set; } = string.Empty;
    }
}
