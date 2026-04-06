import { useCallback, useMemo, useState } from "react";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Link } from "react-router-dom";
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

/** Compact pill for calendar labels (readable on dark bg). */
function stageBadgeClass(name: ProjectStage["name"]): string {
  switch (name) {
    case "demo":
      return "bg-amber-950/90 text-amber-100 border-amber-600/80";
    case "prep":
      return "bg-sky-950/90 text-sky-100 border-sky-600/80";
    case "build/install":
      return "bg-emerald-950/90 text-emerald-100 border-emerald-600/70";
    case "qa":
      return "bg-violet-950/90 text-violet-100 border-violet-600/80";
    default:
      return "bg-brick-800 text-brick-100 border-brick-600";
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

function dateOnlyKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  const x = new Date(y, m - 1, d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Both dates set and calendar day falls in [start, end] inclusive. */
function isDayInStageRange(day: Date, plannedStart: string | null, plannedEnd: string | null): boolean {
  if (!plannedStart?.trim() || !plannedEnd?.trim()) return false;
  const key = dateOnlyKey(day);
  return key >= plannedStart && key <= plannedEnd;
}

function isStageIncomplete(st: ScheduleStage): boolean {
  const a = st.plannedStartDate?.trim() ?? "";
  const b = st.plannedEndDate?.trim() ?? "";
  return !a || !b;
}

function projectHasIncompleteStage(p: ScheduleProject): boolean {
  return p.stages.some(isStageIncomplete);
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

type PatchStage = {
  stageId: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
};

/** Stages with full date range that overlap this calendar day. */
function dayCalendarEvents(
  scheduleProjects: ScheduleProject[],
  day: Date,
): { project: ScheduleProject; stage: ScheduleStage }[] {
  const list: { project: ScheduleProject; stage: ScheduleStage }[] = [];
  for (const p of scheduleProjects) {
    for (const name of STAGE_ORDER) {
      const st = p.stages.find((s) => s.name === name);
      if (st && isDayInStageRange(day, st.plannedStartDate, st.plannedEndDate)) {
        list.push({ project: p, stage: st });
      }
    }
  }
  return list;
}

function buildStagesFromFormValues(
  values: Record<string, string>,
  project: ScheduleProject,
): PatchStage[] | null {
  const stages: PatchStage[] = [];

  for (const name of STAGE_ORDER) {
    const st = project.stages.find((s) => s.name === name);
    if (!st) {
      toast.error("Missing stage data. Refresh and try again.");
      return null;
    }
    const start = values[`${name}_start`]?.trim() ?? "";
    const end = values[`${name}_end`]?.trim() ?? "";
    if (start && end && start > end) {
      toast.error(`${stageLabel(name)}: start must be on or before end.`);
      return null;
    }
    stages.push({
      stageId: st.id,
      plannedStartDate: start || null,
      plannedEndDate: end || null,
    });
  }

  return stages;
}

export default function ProjectSchedulePage() {
  const queryClient = useQueryClient();
  const { data: scheduleProjects } = useSuspenseQuery({
    queryKey: ["my-schedule"],
    queryFn: api.getSchedule,
  });

  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeekMonday(new Date()));
  const [selectedDayKey, setSelectedDayKey] = useState(() => dateOnlyKey(new Date()));

  const weekStart = useMemo(() => startOfWeekMonday(weekAnchor), [weekAnchor]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const todayKey = dateOnlyKey(new Date());

  /** When the visible week changes, keep the selected day on-screen (prefer today if it falls in the week). */
  const [prevWeekStart, setPrevWeekStart] = useState(weekStart);
  if (weekStart.getTime() !== prevWeekStart.getTime()) {
    setPrevWeekStart(weekStart);
    const keys = weekDays.map((d) => dateOnlyKey(d));
    setSelectedDayKey((prev) => {
      if (keys.includes(prev)) return prev;
      const todayK = dateOnlyKey(new Date());
      if (keys.includes(todayK)) return todayK;
      return keys[0];
    });
  }

  const selectedSummaryDay = useMemo(() => parseDayKey(selectedDayKey), [selectedDayKey]);

  const selectedDayItems = useMemo(
    () => dayCalendarEvents(scheduleProjects, selectedSummaryDay),
    [scheduleProjects, selectedSummaryDay],
  );

  const backlogProjects = useMemo(
    () => scheduleProjects.filter(projectHasIncompleteStage),
    [scheduleProjects],
  );

  const patchMutation = useMutation({
    mutationFn: ({
      id,
      stages,
    }: {
      id: string;
      stages: PatchStage[];
    }) => api.patchProjectSchedule(id, { stages }),
    onSuccess: () => {
      toast.success("Schedule updated.");
      queryClient.invalidateQueries({ queryKey: ["my-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    },
  });

  const [editingTimelineId, setEditingTimelineId] = useState<string | null>(null);
  const [selectedBacklogId, setSelectedBacklogId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>(emptyScheduleFormValues());

  const startEditTimeline = (p: ScheduleProject) => {
    setSelectedBacklogId(null);
    setEditingTimelineId(p.id);
    setFormValues(projectToFormValues(p));
  };

  const cancelEditTimeline = () => {
    setEditingTimelineId(null);
    setFormValues(emptyScheduleFormValues());
  };

  const toggleBacklogSelect = (p: ScheduleProject) => {
    setEditingTimelineId(null);
    setSelectedBacklogId((id) => {
      if (id === p.id) {
        setFormValues(emptyScheduleFormValues());
        return null;
      }
      setFormValues(projectToFormValues(p));
      return p.id;
    });
  };

  const handleScheduleSubmit = useCallback(
    (values: Record<string, string>, project: ScheduleProject) => {
      const stages = buildStagesFromFormValues(values, project);
      if (!stages) return;
      patchMutation.mutate({ id: project.id, stages });
      cancelEditTimeline();
      setSelectedBacklogId(null);
    },
    [patchMutation],
  );

  const stageRows = useMemo(() => {
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
    <div className="max-w-6xl mx-auto p-4 md:p-12 space-y-6 md:space-y-8">
      <div className="border-b border-brick-800 pb-4">
        <h1 className="text-2xl font-bold text-brick-100">Project schedule</h1>
        <p className="text-sm text-brick-400 mt-1 max-w-2xl">
          Tap a day in the week calendar to see that day’s work here. Stages are color-coded below. Overall
          project dates follow the earliest stage start and latest stage end.
        </p>
      </div>

      {/* Selected day summary (driven by week calendar) */}
      <section className="rounded-lg border border-brick-800 bg-brick-900/60 p-4 md:p-5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-3">
          <h2 className="text-sm font-semibold text-brick-200 uppercase tracking-wide">
            {selectedSummaryDay.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h2>
          {selectedDayKey === todayKey ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-grass-400 px-1.5 py-0.5 rounded border border-grass-800 bg-grass-950/50">
              Today
            </span>
          ) : null}
        </div>
        {selectedDayItems.length === 0 ? (
          <p className="text-sm text-brick-500 italic">Nothing scheduled for this day.</p>
        ) : (
          <ul className="space-y-2">
            {selectedDayItems.map(({ project, stage }) => (
              <li
                key={`${project.id}-${stage.id}`}
                className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 text-sm border-b border-brick-800/60 pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <span className="font-medium text-brick-100">{project.name}</span>
                  <span className="text-brick-500 hidden sm:inline"> — </span>
                  <span className="text-brick-400 sm:inline block sm:mt-0 mt-0.5">
                    {stageLabel(stage.name)}
                  </span>
                </div>
                <span className="text-xs text-brick-500 font-mono shrink-0">
                  {stage.plannedStartDate} → {stage.plannedEndDate}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Week calendar */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-brick-200">Week calendar</h2>
        <p className="text-sm text-brick-500">Tap a day to show its schedule in the summary above.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setWeekAnchor((d) => {
                const n = new Date(d);
                n.setDate(n.getDate() - 7);
                return n;
              })
            }
            className="text-sm text-brick-200 px-3 py-2 min-h-[44px] border border-brick-700 rounded-md hover:bg-brick-800 cursor-pointer touch-manipulation"
            aria-label="Previous week"
          >
            ←
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
            className="text-sm text-brick-200 px-3 py-2 min-h-[44px] border border-brick-700 rounded-md hover:bg-brick-800 cursor-pointer touch-manipulation"
            aria-label="Next week"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => setWeekAnchor(startOfWeekMonday(new Date()))}
            className="text-sm text-grass-400 px-3 py-2 min-h-[44px] border border-grass-800 rounded-md hover:bg-brick-800 cursor-pointer touch-manipulation"
          >
            This week
          </button>
        </div>

        <p className="text-xs text-brick-500">
          {weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          {" — "}
          {weekDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 items-stretch min-h-0">
          {weekDays.map((d) => {
            const dayKey = dateOnlyKey(d);
            const isToday = dayKey === todayKey;
            const isSelected = dayKey === selectedDayKey;
            const events = dayCalendarEvents(scheduleProjects, d);
            return (
              <div
                key={d.getTime()}
                className={`flex flex-col rounded-lg border overflow-hidden min-h-[100px] sm:min-h-[120px] transition-shadow ${
                  isSelected
                    ? "ring-2 ring-violet-500/90 border-violet-600/70 bg-violet-950/25 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                    : isToday
                      ? "border-grass-600/80 ring-1 ring-grass-600/30 bg-grass-950/20"
                      : "border-brick-800/80 bg-brick-900/50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedDayKey(dayKey)}
                  className={`shrink-0 w-full text-center py-1.5 px-0.5 border-b border-brick-800/60 cursor-pointer touch-manipulation ${
                    isSelected
                      ? "bg-violet-900/50"
                      : isToday
                        ? "bg-grass-900/40"
                        : "bg-brick-950/60 hover:bg-brick-800/50"
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`Select ${d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}`}
                >
                  <div className="text-[9px] sm:text-[10px] font-semibold text-brick-400 uppercase leading-tight">
                    {d.toLocaleDateString(undefined, { weekday: "narrow" })}
                  </div>
                  <div
                    className={`text-sm font-semibold leading-tight ${
                      isSelected ? "text-violet-200" : isToday ? "text-grass-300" : "text-brick-100"
                    }`}
                  >
                    {d.getDate()}
                  </div>
                </button>
                <div
                  onClick={() => setSelectedDayKey(dayKey)}
                  className="flex-1 flex flex-col gap-1 p-1 overflow-y-auto min-h-0 cursor-pointer hover:bg-brick-950/30"
                >
                  {events.length === 0 ? (
                    <span className="text-[10px] text-brick-600 text-center py-1 pointer-events-none">—</span>
                  ) : (
                    events.map(({ project, stage }) => (
                      <Link
                        key={`${project.id}-${stage.id}`}
                        to={`/projects/${project.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={`block rounded border px-1 py-1 text-left shadow-sm active:opacity-90 ${stageBadgeClass(stage.name)}`}
                      >
                        <span className="font-medium block truncate text-[9px] sm:text-[10px] leading-tight">
                          {project.name}
                        </span>
                        <span className="text-[9px] sm:text-[10px] opacity-90 leading-tight block truncate">
                          {stageLabel(stage.name)}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {scheduleProjects.length === 0 ? (
        <p className="text-brick-400 italic bg-brick-900/50 p-6 rounded-lg border border-brick-800/50 text-center">
          No projects yet. Create a project first, then set stage dates here.
        </p>
      ) : (
        <>
          {/* Needs scheduling */}
          {backlogProjects.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-brick-200">Needs scheduling</h2>
              <p className="text-sm text-brick-500">
                Tap a project to set stage dates. Stages still missing a start or end are listed below each
                name.
              </p>
              <ul className="space-y-2">
                {backlogProjects.map((p) => {
                  const incomplete = p.stages.filter(isStageIncomplete);
                  const isSelected = selectedBacklogId === p.id;
                  return (
                    <li key={p.id} className="rounded-lg border border-brick-800 bg-brick-900/80 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleBacklogSelect(p)}
                        className={`w-full text-left p-4 flex flex-col gap-1 transition-colors touch-manipulation ${
                          isSelected ? "bg-brick-800/60" : "hover:bg-brick-800/40 active:bg-brick-800/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-brick-100">{p.name}</span>
                          <span className="text-xs text-grass-400 shrink-0">
                            {isSelected ? "Selected" : "Tap to schedule"}
                          </span>
                        </div>
                        <span className="text-sm text-brick-500">{p.address}</span>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {incomplete.map((st) => (
                            <span
                              key={st.id}
                              className={`text-[10px] font-medium rounded border px-1.5 py-0.5 ${stageBadgeClass(st.name)}`}
                            >
                              {stageLabel(st.name)}
                            </span>
                          ))}
                        </div>
                      </button>
                      {isSelected && (
                        <div className="px-4 pb-4 border-t border-brick-800 pt-3">
                          <DynamicForm
                            fields={SCHEDULE_FORM_FIELDS}
                            values={formValues}
                            onChange={(name, value) =>
                              setFormValues((prev) => ({ ...prev, [name]: value }))
                            }
                            onSubmit={(values) => handleScheduleSubmit(values, p)}
                            submitLabel="Save schedule"
                            onCancel={() => {
                              setSelectedBacklogId(null);
                              setFormValues(emptyScheduleFormValues());
                            }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Edit schedules (all projects) */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-brick-200">Manage schedules</h2>
            <p className="text-sm text-brick-500">
              Open the full stage date editor for any project. The week calendar above shows what is already
              planned.
            </p>
            <div className="rounded-lg border border-brick-800 bg-brick-900/80 overflow-hidden divide-y divide-brick-800/80">
              {scheduleProjects.map((p) => (
                <div key={p.id}>
                  <div className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-brick-100 truncate">{p.name}</div>
                      <div className="text-xs text-brick-500 truncate">{p.address}</div>
                      {p.plannedStartDate || p.plannedEndDate ? (
                        <p className="text-xs text-brick-500 mt-1 font-mono">
                          {p.plannedStartDate ?? "—"} → {p.plannedEndDate ?? "—"}{" "}
                          <span className="text-brick-600 font-sans">(derived)</span>
                        </p>
                      ) : (
                        <p className="text-xs text-brick-500 mt-1 italic">No stage dates yet</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        editingTimelineId === p.id ? cancelEditTimeline() : startEditTimeline(p)
                      }
                      className="text-sm shrink-0 text-brick-300 px-3 py-2 min-h-[40px] border border-brick-700 rounded-md hover:bg-brick-800 cursor-pointer self-start sm:self-center touch-manipulation"
                    >
                      {editingTimelineId === p.id ? "Close editor" : "Edit schedule"}
                    </button>
                  </div>
                  {editingTimelineId === p.id && (
                    <div className="px-3 pb-4 border-t border-brick-800 pt-3">
                      <DynamicForm
                        fields={SCHEDULE_FORM_FIELDS}
                        values={formValues}
                        onChange={(name, value) =>
                          setFormValues((prev) => ({ ...prev, [name]: value }))
                        }
                        onSubmit={(values) => handleScheduleSubmit(values, p)}
                        submitLabel="Save schedule"
                        onCancel={cancelEditTimeline}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Stage breakdown — desktop */}
          <details className="hidden md:block group rounded-lg border border-brick-800 bg-brick-900/40 open:bg-brick-900/60">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-brick-300 hover:text-brick-100 flex items-center gap-2">
              <span className="text-brick-500 group-open:rotate-90 transition-transform">▸</span>
              Stage-by-stage breakdown (this week)
            </summary>
            <div className="overflow-x-auto border-t border-brick-800 px-2 pb-4">
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
                    <div className="font-semibold text-brick-200">
                      {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </div>
                  </div>
                ))}

                {stageRows.map(({ project, stage }) => {
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
          </details>
        </>
      )}
    </div>
  );
}
