import { useMemo, useState } from "react";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DynamicForm } from "../components/DynamicForm";
import { ResourceList } from "../components/ResourceList";
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
): FormFieldConfig[] {
  return [
    {
      type: "select",
      label: "Employee",
      name: "employeeId",
      required: true,
      options: employees.map((e) => ({ value: e.id, label: `${e.name} (${e.type})` })),
    },
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
  ];
}

export default function WorkLogsPage() {
  const queryClient = useQueryClient();
  const { data: workLogs } = useSuspenseQuery({
    queryKey: ["work-logs"],
    queryFn: api.getWorkLogs,
  });
  const { data: employees } = useSuspenseQuery({
    queryKey: ["employees"],
    queryFn: api.getEmployees,
  });
  const { data: projects } = useSuspenseQuery({
    queryKey: ["my-projects"],
    queryFn: api.getProjects,
  });

  const fields = useMemo(
    () => buildFields(employees, projects),
    [employees, projects],
  );

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

  const canAdd = employees.length > 0 && projects.length > 0;

  const handleAdd = () => {
    if (!canAdd) {
      toast.error("Add at least one employee and one project first.");
      return;
    }
    setEditingId(null);
    setFormValues(emptyFormValues());
    setShowForm(true);
  };

  const handleEdit = (item: WorkLog) => {
    setEditingId(item.id);
    setFormValues(workLogToFormValues(item));
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
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
      employeeId: values.employeeId,
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

      {!showForm && (
        <div className="flex items-center justify-end mb-6 pb-4 border-b border-brick-800">
          <button
            type="button"
            onClick={handleAdd}
            className="bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canAdd}
          >
            + Log Work
          </button>
        </div>
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
        items={workLogs}
        titleKey="projectName"
        columns={[
          { label: "Employee", value: (w) => w.employeeName },
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
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        emptyMessage="No work logs yet. Record a shift above."
      />
    </div>
  );
}
