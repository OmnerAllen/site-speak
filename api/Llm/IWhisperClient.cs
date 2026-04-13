using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace SiteSpeak.Llm;

public interface IWhisperClient
{
    Task<string> TranscribeAudioAsync(Stream audioStream, string filename, string language = "", string prompt = "", CancellationToken cancellationToken = default);
}
