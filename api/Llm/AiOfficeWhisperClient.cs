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
        if (audioStream.CanSeek)
        {
            audioStream.Position = 0;
        }
        
        using var ms = new MemoryStream();
        await audioStream.CopyToAsync(ms, cancellationToken);
        var fileBytes = ms.ToArray();
        
        MultipartFormDataContent CreateContent()
        {
            var boundary = System.Guid.NewGuid().ToString();
            var multipart = new MultipartFormDataContent(boundary);
            multipart.Headers.Remove("Content-Type");
            // Some C++ servers do not understand boundary IDs surrounded by quotes, so we strip them explicitly
            multipart.Headers.TryAddWithoutValidation("Content-Type", $"multipart/form-data; boundary={boundary}");
            
            var byteContent = new ByteArrayContent(fileBytes);
            byteContent.Headers.ContentType = new MediaTypeHeaderValue("audio/webm");
            // To prevent .NET from emitting filename*=utf-8'' attributes which break cpp-httplib,
            // we configure the disposition explicitly without using the .Add(content, name, filename) helper
            byteContent.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data")
            {
                Name = "\"file\"",
                FileName = $"\"{filename}\""
            };
            multipart.Add(byteContent);
            
            var jsonContent = new StringContent("json");
            jsonContent.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data") { Name = "\"response_format\"" };
            multipart.Add(jsonContent);
            
            if (!string.IsNullOrEmpty(language) && language != "auto")
            {
                var langContent = new StringContent(language);
                langContent.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data") { Name = "\"language\"" };
                multipart.Add(langContent);
            }
                
            if (!string.IsNullOrEmpty(prompt))
            {
                var promptContent = new StringContent(prompt);
                promptContent.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data") { Name = "\"prompt\"" };
                multipart.Add(promptContent);
            }
                
            return multipart;
        }

        string originalStreamLength = audioStream.CanSeek ? audioStream.Length.ToString() : "Unknown (not seekable)";
        System.Console.WriteLine($"[Whisper API] Initiating transcription to {_httpClient.BaseAddress}. Original stream length: {originalStreamLength} bytes, Payload buffer length: {fileBytes.Length} bytes.");

        // Newer whisper.cpp servers (main branch) removed /inference and use standard OpenAI API routes
        using var contentV1 = CreateContent();
        var response = await _httpClient.PostAsync("/v1/audio/transcriptions", contentV1, cancellationToken);
        
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            response.Dispose();
            using var contentInference = CreateContent();
            response = await _httpClient.PostAsync("/inference", contentInference, cancellationToken);
        }
        
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
