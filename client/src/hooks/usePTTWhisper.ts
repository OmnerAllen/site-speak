import { useState, useRef, useCallback, useEffect } from "react";
import { api } from "../api";
import { deduplicateLeading } from "../utils/whisperLogic";

export function usePTTWhisper(options?: { onTranscriptionComplete?: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef("");
  const mountedRef = useRef(true);

  // Sync state refs to prevent race conditions during rapid start/stops
  const isRecordingRef = useRef(false);
  const isTranscribingRef = useRef(false);
  const recordingVersionRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || isTranscribingRef.current) return;
    
    try {
      let stream = mediaStream;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!mountedRef.current) {
          // Unmounted while awaiting permissions
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        setMediaStream(stream);
      }

      const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
      const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      recordingVersionRef.current += 1;
      const currentVersion = recordingVersionRef.current;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        try {
          if (recordingVersionRef.current !== currentVersion) return;
          const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
          
          if (blob.size === 0) return;

          const PROMPT_WORDS = 20;
          const words = transcriptRef.current.trim().split(/\s+/).filter(Boolean);
          const prompt = words.slice(-PROMPT_WORDS).join(" ");
          
          const { text } = await api.parseAudioWorkLog(blob, "auto", prompt);
          
          if (recordingVersionRef.current !== currentVersion) return;
          
          if (text && mountedRef.current) {
             const newText = deduplicateLeading(transcriptRef.current, text.trim());
             if (newText) {
                const nextTranscript = transcriptRef.current ? transcriptRef.current + " " + newText : newText;
                transcriptRef.current = nextTranscript;
                setTranscript(nextTranscript);
             }
             if (optionsRef.current?.onTranscriptionComplete) {
                optionsRef.current.onTranscriptionComplete(transcriptRef.current);
             }
          }
        } catch (err) {
          console.error("Transcription error:", err);
          import("react-hot-toast").then((module) => {
            module.default.error(err instanceof Error ? err.message : "Failed to transcribe audio.");
          });
        } finally {
          if (mountedRef.current && recordingVersionRef.current === currentVersion) {
            isTranscribingRef.current = false;
            setIsTranscribing(false);
          }
        }
      };

      mediaRecorder.start(100);
      isRecordingRef.current = true;
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
      // Let it fail silently or emit warning
    }
  }, [mediaStream]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    
    isRecordingRef.current = false;
    isTranscribingRef.current = true;
    
    setIsRecording(false);
    setIsTranscribing(true); // Close the interaction gap synchronously
    
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === "recording") {
      mr.stop();
    }
  }, []);

  const clearTranscript = useCallback(() => {
    recordingVersionRef.current += 1;
    transcriptRef.current = "";
    setTranscript("");
    setIsTranscribing(false);
    isTranscribingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [mediaStream]);

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
