import type { Employee, FormFieldConfig, Project, WorkLog } from "../types";
import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQueryClient, useSuspenseQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";
import { DynamicForm } from "../components/DynamicForm";
import { ResourceList } from "../components/ResourceList";
import { AudioVisualizer } from "../components/AudioVisualizer";
import { usePTTWhisper } from "../hooks/usePTTWhisper";

function VoicePlaybackTester() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [transcription, setTranscription] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
    };
  }, [audioUrl, mediaStream]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);

      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"].find(
        (t) => MediaRecorder.isTypeSupported(t)
      ) || "";

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size > 0) {
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        }
        stream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);
      };

      mr.start(100);
      setIsRecording(true);
      setAudioBlob(null);
      setTranscription("");
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
    } catch {
       toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setIsTranscribing(true);
    setTranscription("");
    try {
      const { text } = await api.parseAudioWorkLog(audioBlob);
      setTranscription(text);
      console.log("transcription: ", text);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to transcribe audio.");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="mb-6 p-4 bg-brick-900/40 rounded-lg border border-brick-800">
      <h3 className="text-lg font-medium text-brick-200 mb-2">Mic Test (Local Playback & Transcribe)</h3>
      <p className="text-sm text-brick-400 mb-4">Record your voice and play it back, or send it to AI for transcription.</p>
      <div className="flex items-center flex-wrap gap-4">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            isRecording 
              ? "bg-red-600 text-white hover:bg-red-500 animate-pulse border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]" 
              : "bg-brick-800 text-brick-300 hover:bg-brick-700"
          }`}
        >
          {isRecording ? "⏹ Stop Recording" : "⏺ Start Test Recording"}
        </button>
        {audioUrl && !isRecording && (
          <audio controls src={audioUrl} className="h-10" />
        )}
        {audioBlob && !isRecording && (
          <button
            type="button"
            onClick={handleTranscribe}
            disabled={isTranscribing}
            className="px-4 py-2 bg-sky-600 text-white rounded-md font-medium hover:bg-sky-500 disabled:opacity-50 transition-colors"
          >
            {isTranscribing ? "⏳ Transcribing..." : "📝 Transcribe"}
          </button>
        )}
      </div>
      {isRecording && mediaStream && (
        <div className="mt-4 p-2 bg-brick-950/80 rounded border border-brick-800">
          <AudioVisualizer stream={mediaStream} />
        </div>
      )}
      {transcription && (
        <div className="mt-4 p-3 bg-brick-950/80 rounded border border-brick-800 text-brick-100 whitespace-pre-wrap">
          <strong className="text-sky-400 block mb-1">Transcription:</strong>
          {transcription}
        </div>
      )}
    </div>
  );
}

function emptyFormValues(): Record<string, string> {
  return {
    employeeId: "",
    projectId: "",
    startedAt: "",
    endedAt: "",
    notes: "",
  };
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function workLogToFormValues(w: WorkLog): Record<string, string> {
  return {
    employeeId: w.employeeId,
    projectId: w.projectId,
    startedAt: toDatetimeLocalValue(w.startedAt),
    endedAt: toDatetimeLocalValue(w.endedAt),
    notes: w.notes ?? "",
  };
}

function buildFields(
  employees: Employee[],
  projects: Project[],
  defaultEmployeeId?: string,
): FormFieldConfig[] {
  const fields: FormFieldConfig[] = [];

  if (!defaultEmployeeId) {
    fields.push({
      type: "select",
      label: "Employee",
      name: "employeeId",
      required: true,
      options: employees.map((e) => ({ value: e.id, label: `${e.name} (${e.type})` })),
    });
  }

  fields.push(
    {
      type: "select",
      label: "Project",
      name: "projectId",
      required: true,
      options: projects.map((p) => ({ value: p.id, label: p.name })),
    },
    {
      type: "datetime-local",
      label: "Started",
      name: "startedAt",
      required: true,
    },
    {
      type: "datetime-local",
      label: "Ended",
      name: "endedAt",
      required: true,
    },
    {
      type: "large-text",
      label: "Notes",
      name: "notes",
      placeholder: "Optional details about this shift…",
      required: false,
    },
  );

  return fields;
}

export default function WorkLogsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const employeeIdQuery = searchParams.get("employeeId");

  const queryClient = useQueryClient();
  const { data: workLogs } = useSuspenseQuery({
    queryKey: ["work-logs"],
    queryFn: api.getWorkLogs,
  });

  const filteredWorkLogs = useMemo(() => {
    if (!employeeIdQuery) return workLogs;
    return workLogs.filter((w) => w.employeeId === employeeIdQuery);
  }, [workLogs, employeeIdQuery]);

  const { data: employees } = useSuspenseQuery({
    queryKey: ["employees"],
    queryFn: api.getEmployees,
  });
  const { data: projects } = useSuspenseQuery({
    queryKey: ["my-projects"],
    queryFn: api.getProjects,
  });

  const fields = useMemo(
    () => buildFields(employees, projects, employeeIdQuery ?? undefined),
    [employees, projects, employeeIdQuery],
  );

  const selectedEmployee = employeeIdQuery
    ? employees.find((e) => e.id === employeeIdQuery)
    : undefined;

  const createMutation = useMutation({
    mutationFn: (body: Parameters<typeof api.createWorkLog>[0]) => api.createWorkLog(body),
    onSuccess: () => {
      toast.success("Work log saved.");
      queryClient.invalidateQueries({ queryKey: ["work-logs"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string } & Parameters<typeof api.updateWorkLog>[1]) =>
      api.updateWorkLog(id, body),
    onSuccess: () => {
      toast.success("Work log updated.");
      queryClient.invalidateQueries({ queryKey: ["work-logs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteWorkLog(id),
    onSuccess: () => {
      toast.success("Work log deleted.");
      queryClient.invalidateQueries({ queryKey: ["work-logs"] });
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>(emptyFormValues());

  const parseTextMutation = useMutation({
    mutationFn: (text: string) => api.parseTextWorkLog(text),
    onSuccess: (data, text) => {
      handleDictationFinish({ draft: data.draft, transcript: text });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to parse dictation");
    },
  });

  const dictation = usePTTWhisper({
    onTranscriptionComplete: (text) => {
      if (!showForm) return; // ignore if form closed
      if (text.trim()) {
        parseTextMutation.mutate(text);
      }
    }
  });

  const handleDictationFinish = (data: { draft: import("../types").WorkLogDraft; transcript: string }) => {
    const { draft } = data;
    setFormValues((prev) => {
      const merged = { ...prev };
      if (!merged.projectId && draft.projectId) merged.projectId = draft.projectId;
      if (!merged.startedAt && draft.startedAt) merged.startedAt = toDatetimeLocalValue(draft.startedAt);
      if (!merged.endedAt && draft.endedAt) merged.endedAt = toDatetimeLocalValue(draft.endedAt);
      if (draft.notes) {
        merged.notes = merged.notes ? `${merged.notes}\n\n${draft.notes}` : draft.notes;
      }
      return merged;
    });
    dictation.clearTranscript();
    toast.success("Dictation applied to form!");
  };

  const handleToggleDictation = () => {
    if (dictation.isRecording) {
      dictation.stopRecording();
    } else {
      dictation.startRecording();
    }
  };

  const canAdd = employees.length > 0 && projects.length > 0;

  const handleAdd = () => {
    if (!canAdd) {
      toast.error("Add at least one employee and one project first.");
      return;
    }
    setEditingId(null);
    setFormValues({
      ...emptyFormValues(),
      employeeId: employeeIdQuery ?? "",
    });
    setShowForm(true);
  };

  const handleEdit = (item: WorkLog) => {
    setEditingId(item.id);
    setFormValues(workLogToFormValues(item));
    setShowForm(true);
  };

  const handleCancel = () => {
    if (dictation.isRecording) {
      dictation.stopRecording();
    }
    setShowForm(false);
    setEditingId(null);
    setFormValues(emptyFormValues());
    dictation.clearTranscript();
    parseTextMutation.reset();
  };

  const handleSubmit = (values: Record<string, string>) => {
    const started = new Date(values.startedAt);
    const ended = new Date(values.endedAt);
    if (Number.isNaN(started.getTime()) || Number.isNaN(ended.getTime())) {
      toast.error("Invalid dates.");
      return;
    }
    if (started >= ended) {
      toast.error("End time must be after start time.");
      return;
    }
    const body = {
      employeeId: employeeIdQuery ?? values.employeeId,
      projectId: values.projectId,
      startedAt: started.toISOString(),
      endedAt: ended.toISOString(),
      notes: values.notes.trim() || null,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...body });
    } else {
      createMutation.mutate(body);
    }
    handleCancel();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12">
      {!canAdd && (
        <p className="mb-6 text-sm text-brick-400 bg-brick-900/60 border border-brick-800 rounded-lg p-4">
          Create employees and projects before logging time. Empty selects mean there is no data to
          attach this entry to.
        </p>
      )}

      {employeeIdQuery && selectedEmployee && (
        <p className="mb-6 text-sm text-brick-300 bg-brick-900/60 border border-brick-800 rounded-lg p-4">
          Logging for <strong>{selectedEmployee.name}</strong>
        </p>
      )}

      {!showForm && (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-brick-800">
          <button
            type="button"
            onClick={() => navigate("/employees")}
            className="bg-brick-800 text-brick-300 font-medium py-2 px-4 rounded-md hover:bg-brick-700 transition-colors cursor-pointer"
          >
            Back to Employee
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className="bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Log Work
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mb-8 bg-brick-900/40 p-6 rounded-lg border border-brick-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-brick-200">
              {editingId ? "Edit Work Log" : "New Work Log"}
            </h2>
            <button
              type="button"
              onClick={handleToggleDictation}
              disabled={parseTextMutation.isPending || dictation.isTranscribing}
              className={`flex items-center gap-2 font-medium py-2 px-4 rounded-md transition-colors cursor-pointer ${
                dictation.isRecording
                  ? "bg-red-600 text-white hover:bg-red-500 animate-pulse border border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                  : dictation.isTranscribing || parseTextMutation.isPending
                  ? "bg-yellow-600 text-white border border-yellow-400 cursor-wait opacity-80"
                  : "bg-sky-600 text-white hover:bg-sky-500 border border-sky-400"
              }`}
            >
              {dictation.isRecording 
                ? "⏹ Stop Recording" 
                : dictation.isTranscribing 
                  ? "⏳ Transcribing..." 
                  : parseTextMutation.isPending
                    ? "🤖 AI Processing..."
                    : "🎤 Dictate"}
            </button>
          </div>

          {(dictation.isRecording || dictation.isTranscribing || parseTextMutation.isPending || dictation.transcript) && (
            <div className="mb-6 p-4 bg-brick-950/80 border border-brick-800 rounded-lg">
              {dictation.isRecording && <AudioVisualizer stream={dictation.mediaStream} />}
              <div className="mt-2 text-brick-100 whitespace-pre-wrap min-h-[40px]">
                {dictation.transcript || (
                  <span className="text-brick-500 italic">
                    {dictation.isRecording ? "Listening..." : "Processing audio..."}
                  </span>
                )}
                {dictation.isTranscribing && <span className="text-sky-500 italic ml-2">Transcribing...</span>}
              </div>
            </div>
          )}

          <DynamicForm
            fields={fields}
            values={formValues}
            onChange={(name, value) => setFormValues((prev) => ({ ...prev, [name]: value }))}
            onSubmit={handleSubmit}
            submitLabel={editingId ? "Save Changes" : "Save Log"}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* Voice recorder tester added per your request */}
      <VoicePlaybackTester />

      <ResourceList
        items={filteredWorkLogs}
        titleKey="projectName"
        badgeKey="employeeName"
        columns={[
          {
            label: "Started",
            value: (w) => (
              <span className="font-mono text-brick-300">{new Date(w.startedAt).toLocaleString()}</span>
            ),
          },
          {
            label: "Ended",
            value: (w) => (
              <span className="font-mono text-brick-300">{new Date(w.endedAt).toLocaleString()}</span>
            ),
          },
          {
            label: "Notes",
            value: (w) => (
              <span className="line-clamp-2 max-w-xs">{w.notes?.trim() || "—"}</span>
            ),
          },
        ]}
        onItemClick={handleEdit}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        emptyMessage="No work logs yet. Record a shift above."
      />
    </div>
  );
}
