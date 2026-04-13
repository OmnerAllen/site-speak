using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace SiteSpeak.Llm;

public class DummyWhisperClient : IWhisperClient
{
    public Task<string> TranscribeAudioAsync(Stream audioStream, string filename, string language = "", string prompt = "", CancellationToken cancellationToken = default)
    {
        return Task.FromResult("I worked on the main office project today from 8 AM to 4 PM, installing lighting fixtures.");
    }
}
