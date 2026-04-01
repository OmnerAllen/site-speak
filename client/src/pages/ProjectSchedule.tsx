import { useMemo, useState } from "react";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DynamicForm } from "../components/DynamicForm";
import { api } from "../api";
import type { FormFieldConfig, ProjectStage, ScheduleProject, ScheduleStage } from "../types";

const MS_DAY = 86400000;

const STAGE_ORDER: ProjectStage["name"][] = ["demo", "prep", "build/install", "qa"];

function stageLabel(name: ProjectStage["name"]): string {
  if (name === "build/install") return "Build/Install";
  if (name === "qa") return "QA";
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

function stageBarClass(name: ProjectStage["name"]): string {
  switch (name) {
    case "demo":
      return "bg-amber-800/90 border-amber-600";
    case "prep":
      return "bg-sky-800/90 border-sky-600";
    case "build/install":
      return "bg-grass-800/90 border-grass-700";
    case "qa":
      return "bg-violet-800/90 border-violet-600";
    default:
      return "bg-grass-800/90 border-grass-700";
  }
}

/** Monday 00:00 local for the week containing `d`. */
function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Inclusive end date → exclusive end timestamp for overlap math. */
function overlapSegment(
  weekStart: Date,
  plannedStart: string | null,
  plannedEnd: string | null,
): { leftPct: number; widthPct: number } | null {
  if (!plannedStart || !plannedEnd) return null;
  const s = parseLocalDate(plannedStart);
  const e = parseLocalDate(plannedEnd);
  const ws = weekStart.getTime();
  const we = ws + 7 * MS_DAY;
  const segStart = Math.max(s.getTime(), ws);
  const segEnd = Math.min(e.getTime() + MS_DAY, we);
  if (segStart >= segEnd) return null;
  return {
    leftPct: ((segStart - ws) / (7 * MS_DAY)) * 100,
    widthPct: ((segEnd - segStart) / (7 * MS_DAY)) * 100,
  };
}

function buildScheduleFormFields(): FormFieldConfig[] {
  return STAGE_ORDER.flatMap((name) => [
    {
      type: "date" as const,
      label: `${stageLabel(name)} — start`,
      name: `${name}_start`,
      required: false,
    },
    {
      type: "date" as const,
      label: `${stageLabel(name)} — end`,
      name: `${name}_end`,
      required: false,
    },
  ]);
}

const SCHEDULE_FORM_FIELDS = buildScheduleFormFields();

function emptyScheduleFormValues(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const name of STAGE_ORDER) {
    o[`${name}_start`] = "";
    o[`${name}_end`] = "";
  }
  return o;
}

function projectToFormValues(p: ScheduleProject): Record<string, string> {
  const o = emptyScheduleFormValues();
  for (const st of p.stages) {
    o[`${st.name}_start`] = st.plannedStartDate ?? "";
    o[`${st.name}_end`] = st.plannedEndDate ?? "";
  }
  return o;
}

function formatDayHeader(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function ProjectSchedulePage() {
  const queryClient = useQueryClient();
  const { data: scheduleProjects } = useSuspenseQuery({
    queryKey: ["my-schedule"],
    queryFn: api.getSchedule,
  });

  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeekMonday(new Date()));

  const weekStart = useMemo(() => startOfWeekMonday(weekAnchor), [weekAnchor]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const patchMutation = useMutation({
    mutationFn: ({
      id,
      stages,
    }: {
      id: string;
      stages: Array<{
        stageId: string;
        plannedStartDate: string | null;
        plannedEndDate: string | null;
      }>;
    }) => api.patchProjectSchedule(id, { stages }),
    onSuccess: () => {
      toast.success("Schedule updated.");
      queryClient.invalidateQueries({ queryKey: ["my-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    },
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>(emptyScheduleFormValues());

  const startEdit = (p: ScheduleProject) => {
    setEditingId(p.id);
    setFormValues(projectToFormValues(p));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormValues(emptyScheduleFormValues());
  };

  const handleScheduleSubmit = (values: Record<string, string>, project: ScheduleProject) => {
    const stages: Array<{
      stageId: string;
      plannedStartDate: string | null;
      plannedEndDate: string | null;
    }> = [];

    for (const name of STAGE_ORDER) {
      const st = project.stages.find((s) => s.name === name);
      if (!st) {
        toast.error("Missing stage data. Refresh and try again.");
        return;
      }
      const start = values[`${name}_start`]?.trim() ?? "";
      const end = values[`${name}_end`]?.trim() ?? "";
      if (start && end && start > end) {
        toast.error(`${stageLabel(name)}: start must be on or before end.`);
        return;
      }
      stages.push({
        stageId: st.id,
        plannedStartDate: start || null,
        plannedEndDate: end || null,
      });
    }

    patchMutation.mutate({ id: project.id, stages });
    cancelEdit();
  };

  const rows = useMemo(() => {
    const list: { project: ScheduleProject; stage: ScheduleStage }[] = [];
    for (const p of scheduleProjects) {
      for (const name of STAGE_ORDER) {
        const st = p.stages.find((s) => s.name === name);
        if (st) list.push({ project: p, stage: st });
      }
    }
    return list;
  }, [scheduleProjects]);

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-8">
      <div className="border-b border-brick-800 pb-4">
        <h1 className="text-2xl font-bold text-brick-100">Project schedule</h1>
        <p className="text-sm text-brick-400 mt-1 max-w-2xl">
          Plan each stage on the timeline. Overall project dates are derived from the earliest stage start
          and latest stage end.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            setWeekAnchor((d) => {
              const n = new Date(d);
              n.setDate(n.getDate() - 7);
              return n;
            })
          }
          className="text-sm text-brick-200 px-3 py-1.5 border border-brick-700 rounded-md hover:bg-brick-800 cursor-pointer"
        >
          ← Previous week
        </button>
        <button
          type="button"
          onClick={() =>
            setWeekAnchor((d) => {
              const n = new Date(d);
              n.setDate(n.getDate() + 7);
              return n;
            })
          }
          className="text-sm text-brick-200 px-3 py-1.5 border border-brick-700 rounded-md hover:bg-brick-800 cursor-pointer"
        >
          Next week →
        </button>
        <button
          type="button"
          onClick={() => setWeekAnchor(startOfWeekMonday(new Date()))}
          className="text-sm text-grass-400 px-3 py-1.5 border border-grass-800 rounded-md hover:bg-brick-800 cursor-pointer"
        >
          This week
        </button>
        <span className="text-sm text-brick-500 ml-auto font-mono">
          {weekDays[0].toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          {" — "}
          {weekDays[6].toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {scheduleProjects.length === 0 ? (
        <p className="text-brick-400 italic bg-brick-900/50 p-6 rounded-lg border border-brick-800/50 text-center">
          No projects yet. Create a project first, then set stage dates here.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-brick-800 bg-brick-900/80">
          <div
            className="grid min-w-[720px]"
            style={{
              gridTemplateColumns: "minmax(220px,1fr) repeat(7, minmax(56px, 1fr))",
            }}
          >
            <div className="sticky left-0 z-20 bg-brick-950 border-b border-brick-800 border-r p-2 text-xs font-semibold text-brick-400 uppercase tracking-wide">
              Project / stage
            </div>
            {weekDays.map((d) => (
              <div
                key={d.getTime()}
                className="border-b border-brick-800 p-2 text-center text-xs text-brick-300"
              >
                <div className="font-semibold text-brick-200">{formatDayHeader(d)}</div>
              </div>
            ))}

            {rows.map(({ project, stage }) => {
              const seg = overlapSegment(weekStart, stage.plannedStartDate, stage.plannedEndDate);
              return (
                <div key={`${project.id}-${stage.id}`} className="contents">
                  <div className="sticky left-0 z-10 bg-brick-900/95 border-b border-r border-brick-800/80 p-2 text-sm">
                    <div className="text-[11px] font-semibold text-brick-300 truncate leading-tight">
                      {project.name}
                    </div>
                    <div className="text-brick-400 text-xs mt-0.5">{stageLabel(stage.name)}</div>
                  </div>
                  <div className="col-start-2 col-span-7 border-b border-brick-800/50 p-1 relative min-h-[40px]">
                    <div className="absolute inset-1 grid grid-cols-7 gap-px pointer-events-none">
                      {weekDays.map((d) => (
                        <div
                          key={d.getTime()}
                          className="rounded-sm bg-brick-950/50 border border-brick-800/50"
                        />
                      ))}
                    </div>
                    {seg && (
                      <div
                        className="absolute top-1 bottom-1 rounded pointer-events-none z-1"
                        style={{
                          left: `calc(${seg.leftPct}% + 4px)`,
                          width: `calc(${seg.widthPct}% - 8px)`,
                          maxWidth: "calc(100% - 8px)",
                        }}
                      >
                        <div
                          className={`h-full rounded border ${stageBarClass(stage.name)}`}
                          title={`${stage.name}: ${stage.plannedStartDate ?? "—"} → ${stage.plannedEndDate ?? "—"}`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {scheduleProjects.length > 0 && (
        <ul className="space-y-4">
          {scheduleProjects.map((p) => (
            <li
              key={p.id}
              className="bg-brick-900 border border-brick-800 rounded-lg p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-brick-200">{p.name}</h2>
                  <p className="text-sm text-brick-500 mt-0.5">{p.address}</p>
                  <p className="text-sm text-brick-400 mt-2">
                    {p.plannedStartDate || p.plannedEndDate ? (
                      <>
                        <span className="font-mono text-grass-500">
                          {p.plannedStartDate ?? "—"}
                        </span>
                        {" → "}
                        <span className="font-mono text-grass-500">
                          {p.plannedEndDate ?? "—"}
                        </span>
                        <span className="text-brick-600 ml-2">(derived)</span>
                      </>
                    ) : (
                      <span className="italic">No stage dates yet</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {editingId === p.id ? (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-sm text-brick-300 px-3 py-1.5 border border-brick-700 rounded-md hover:bg-brick-800 cursor-pointer"
                    >
                      Close
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="text-sm text-brick-300 px-3 py-1.5 border border-brick-700 rounded-md hover:bg-brick-800 cursor-pointer"
                    >
                      Edit stage dates
                    </button>
                  )}
                </div>
              </div>

              {editingId === p.id && (
                <div className="pt-2 border-t border-brick-800">
                  <DynamicForm
                    fields={SCHEDULE_FORM_FIELDS}
                    values={formValues}
                    onChange={(name, value) =>
                      setFormValues((prev) => ({ ...prev, [name]: value }))
                    }
                    onSubmit={(values) => handleScheduleSubmit(values, p)}
                    submitLabel="Save schedule"
                    onCancel={cancelEdit}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
