import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DynamicForm } from "../components/DynamicForm";
import { ResourceList } from "../components/ResourceList";
import { DictationWidget } from "../components/DictationWidget";
import { api } from "../api";
import type { Employee, FormFieldConfig, Project, WorkLog } from "../types";

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
  const [showDictation, setShowDictation] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>(emptyFormValues());

  const handleDictationFinish = (data: { draft: import("../types").WorkLogDraft; transcript: string }) => {
    const { draft, transcript } = data;
    setEditingId(null);
    setFormValues({
      ...emptyFormValues(),
      employeeId: employeeIdQuery ?? "",
      projectId: draft.projectId ?? "",
      startedAt: draft.startedAt ? toDatetimeLocalValue(draft.startedAt) : "",
      endedAt: draft.endedAt ? toDatetimeLocalValue(draft.endedAt) : "",
      notes: draft.notes ? `${draft.notes}\n\n[Transcript: ${transcript}]` : `[Transcript: ${transcript}]`,
    });
    setShowDictation(false);
    setShowForm(true);
  };

  const handleStartDictation = () => {
    setShowDictation(true);
    setShowForm(false);
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
    setShowDictation(false);
    setShowForm(true);
  };

  const handleEdit = (item: WorkLog) => {
    setEditingId(item.id);
    setFormValues(workLogToFormValues(item));
    setShowDictation(false);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setShowDictation(false);
    setEditingId(null);
    setFormValues(emptyFormValues());
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

      {!showForm && !showDictation && (
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
              onClick={handleStartDictation}
              disabled={!canAdd}
              className="flex items-center gap-2 font-medium py-2 px-4 rounded-md transition-colors cursor-pointer bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎤 Dictate Work Log
            </button>
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

      {showDictation && (
        <DictationWidget
          onCancel={handleCancel}
          onFinish={handleDictationFinish}
        />
      )}

      {showForm && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-brick-200 mb-4">
            {editingId ? "Edit Work Log" : "New Work Log"}
          </h2>
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
