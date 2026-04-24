import { useMemo, useState } from "react";
import { DateInput } from "../forms/DateInput";
import type { ProjectStage, ScheduleProject } from "../../types";

const STAGE_ORDER: ProjectStage["name"][] = ["demo", "prep", "build/install", "qa"];

function stageLabel(name: ProjectStage["name"]): string {
  if (name === "build/install") return "Build/Install";
  if (name === "qa") return "QA";
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

function shortStageTabLabel(name: ProjectStage["name"]): string {
  if (name === "build/install") return "Build";
  return stageLabel(name);
}

function stageBadgeClass(name: ProjectStage["name"]): string {
  switch (name) {
    case "demo":
      return "bg-amber-950/90 text-amber-100 border-amber-600/80";
    case "prep":
      return "bg-sky-950/90 text-sky-100 border-sky-600/80";
    case "build/install":
      return "bg-emerald-950/90 text-emerald-100 border-emerald-600/70";
    case "qa":
      return "bg-rose-950/90 text-rose-100 border-rose-600/80";
    default:
      return "bg-brick-800 text-brick-100 border-brick-600";
  }
}

function isStageRangeIncompleteInForm(values: Record<string, string>, name: ProjectStage["name"]): boolean {
  const start = values[`${name}_start`]?.trim() ?? "";
  const end = values[`${name}_end`]?.trim() ?? "";
  return !start || !end;
}

function defaultActiveStage(project: ScheduleProject, values: Record<string, string>): ProjectStage["name"] {
  for (const name of STAGE_ORDER) {
    const st = project.stages.find((s) => s.name === name);
    if (st && isStageRangeIncompleteInForm(values, name)) return name;
  }
  return STAGE_ORDER[0];
}

export type StageScheduleEditorProps = {
  project: ScheduleProject;
  formValues: Record<string, string>;
  onFieldChange: (name: string, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  savePending?: boolean;
  submitLabel?: string;
};

export function StageScheduleEditor({
  project,
  formValues,
  onFieldChange,
  onSave,
  onCancel,
  savePending = false,
  submitLabel = "Save schedule",
}: StageScheduleEditorProps) {
  const [activeStage, setActiveStage] = useState<ProjectStage["name"]>(() =>
    defaultActiveStage(project, formValues),
  );

  const stageMeta = useMemo(() => {
    return STAGE_ORDER.map((name) => {
      const incomplete = isStageRangeIncompleteInForm(formValues, name);
      const start = formValues[`${name}_start`]?.trim() ?? "";
      const end = formValues[`${name}_end`]?.trim() ?? "";
      const invalidOrder = Boolean(start && end && start > end);
      return { name, incomplete, invalidOrder };
    });
  }, [formValues]);

  const startName = `${activeStage}_start`;
  const endName = `${activeStage}_end`;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div
        className="rounded-xl border border-brick-600/80 bg-linear-to-b from-brick-950/90 to-brick-900/95 p-1.5 shadow-inner ring-1 ring-brick-800/60"
        role="tablist"
        aria-label="Stage"
      >
        <div className="flex flex-wrap gap-1 sm:gap-1.5 justify-center sm:justify-start">
          {stageMeta.map(({ name, incomplete, invalidOrder }) => {
            const active = name === activeStage;
            return (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveStage(name)}
                className={`relative shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer touch-manipulation ${
                  active
                    ? `${stageBadgeClass(name)} ring-2 ring-grass-500/80 ring-offset-2 ring-offset-brick-950 shadow-md scale-[1.02]`
                    : `${stageBadgeClass(name)} opacity-75 hover:opacity-100`
                }`}
              >
                <span className="sm:hidden">{shortStageTabLabel(name)}</span>
                <span className="hidden sm:inline">{stageLabel(name)}</span>
                {(incomplete || invalidOrder) && (
                  <span
                    className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-brick-500 border border-brick-900"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-brick-700/90 bg-brick-950/40 px-3 py-4 sm:px-5 sm:py-5">
        <p className="text-xs font-medium uppercase tracking-wide text-brick-300 mb-3">
          {stageLabel(activeStage)}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-xl">
          <DateInput
            label="Start"
            name={startName}
            value={formValues[startName] ?? ""}
            onChange={(e) => onFieldChange(startName, e.target.value)}
          />
          <DateInput
            label="End"
            name={endName}
            value={formValues[endName] ?? ""}
            onChange={(e) => onFieldChange(endName, e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={savePending}
          className="px-4 py-2 text-brick-300 hover:text-brick-100 border border-brick-600 rounded-md hover:bg-brick-700 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={savePending}
          className="bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 focus:outline-none focus:ring-2 focus:ring-brick-500 focus:ring-offset-2 focus:ring-offset-brick-800 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {savePending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
