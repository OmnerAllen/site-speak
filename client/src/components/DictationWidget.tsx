import { useEffect } from "react";
import { usePTTWhisper } from "../hooks/usePTTWhisper";
import { AudioVisualizer } from "./AudioVisualizer";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api";
import toast from "react-hot-toast";

interface Props {
  onCancel: () => void;
  onFinish: (data: { draft: import("../types").WorkLogDraft; transcript: string }) => void;
}

export function DictationWidget({ onCancel, onFinish }: Props) {
  const {
    isRecording,
    isTranscribing,
    transcript,
    mediaStream,
    startRecording,
    stopRecording,
    clearTranscript,
  } = usePTTWhisper();

  const parseTextMutation = useMutation({
    mutationFn: (text: string) => api.parseTextWorkLog(text),
    onSuccess: (data) => {
      toast.success("Draft extracted from text!");
      onFinish(data);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to parse text");
    },
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        startRecording();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        stopRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [startRecording, stopRecording]);

  const handleFinish = () => {
    if (!transcript.trim()) {
      toast.error("Please dictate something before finishing.");
      return;
    }
    parseTextMutation.mutate(transcript);
  };

  return (
    <div className="bg-brick-900 border border-brick-800 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-brick-200 font-semibold text-lg">Push-to-Talk Dictation</h3>
        <button type="button" onClick={onCancel} className="text-brick-400 hover:text-brick-200 uppercase text-sm">Cancel</button>
      </div>

      <AudioVisualizer stream={isRecording ? mediaStream : null} />

      <div className="min-h-[160px] max-w-full bg-brick-950 border border-brick-800 rounded-lg p-4 mb-4 text-brick-100 whitespace-pre-wrap">
        {transcript || <span className="text-brick-500 italic">Hold the button below or Spacebar, and start speaking...</span>}
        {isTranscribing && <span className="text-sky-500 italic ml-2">Transcribing...</span>}
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            startRecording();
          }}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            stopRecording();
          }}
          onPointerCancel={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            stopRecording();
          }}
          className={`flex items-center justify-center w-32 h-32 rounded-full border-4 font-bold select-none cursor-pointer transition-all ${
            isRecording ? "bg-red-600 border-red-400 text-white transform scale-95 shadow-[0_0_20px_rgba(220,38,38,0.5)]" 
            : isTranscribing ? "bg-yellow-600 border-yellow-400 text-white cursor-wait"
            : "bg-brick-800 border-sky-500 text-sky-400 hover:bg-brick-700"
          }`}
        >
          {isRecording ? "Recording..." : isTranscribing ? "Wait..." : "Hold to Talk"}
        </button>

        <div className="flex gap-2">
          <button 
            type="button" 
            onClick={clearTranscript} 
            className="px-4 py-2 bg-brick-800 text-brick-300 rounded hover:bg-brick-700"
            disabled={!transcript || isRecording || isTranscribing}
          >
            Clear Text
          </button>
          <button
            type="button"
            onClick={handleFinish}
            disabled={!transcript || isRecording || isTranscribing || parseTextMutation.isPending}
            className="px-6 py-2 bg-grass-700 text-grass-100 rounded hover:bg-grass-600 disabled:opacity-50 font-medium"
          >
            {parseTextMutation.isPending ? "Generating Draft..." : "Convert to Entry  →"}
          </button>
        </div>
      </div>
    </div>
  );
}
