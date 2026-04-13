import { useState, useRef, useCallback } from "react";
import { api } from "../api";
import { deduplicateLeading } from "../utils/whisperLogic";

export function usePTTWhisper() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef("");

  const startRecording = useCallback(async () => {
    if (isRecording || isTranscribing) return;
    
    try {
      let stream = mediaStream;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setMediaStream(stream);
      }

      const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
      const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);

        try {
          const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
          
          if (blob.size === 0) return;

          const PROMPT_WORDS = 20;
          const words = transcriptRef.current.trim().split(/\s+/).filter(Boolean);
          const prompt = words.slice(-PROMPT_WORDS).join(" ");
          
          const { text } = await api.parseAudioWorkLog(blob, "auto", prompt);
          
          if (text) {
             const newText = deduplicateLeading(transcriptRef.current, text.trim());
             if (newText) {
                const nextTranscript = transcriptRef.current ? transcriptRef.current + " " + newText : newText;
                transcriptRef.current = nextTranscript;
                setTranscript(nextTranscript);
             }
          }
        } catch (err) {
          console.error("Transcription error:", err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
      throw new Error("Could not start microphone");
    }
  }, [isRecording, isTranscribing, mediaStream]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    setIsRecording(false);
    
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === "recording") {
      mr.stop();
    }
  }, [isRecording]);

  const clearTranscript = useCallback(() => {
    transcriptRef.current = "";
    setTranscript("");
  }, []);

  return {
    isRecording,
    isTranscribing,
    transcript,
    mediaStream,
    setTranscript,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}
