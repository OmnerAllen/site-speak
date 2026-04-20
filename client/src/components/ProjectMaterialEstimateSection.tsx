import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";
import { STAGE_ORDER, type DraftStage } from "../ai/materialEstimateTypes";
import type { ProjectStageResourcesResponse, StageName, StageResourcesPutBody } from "../types";

/** Site Speak @theme radioactive palette — keep classes referenced for Tailwind. */
const MATERIALS_PANEL_DEFAULT =
  "rounded-lg border border-brick-700 bg-brick-800 p-4 md:p-6 space-y-5 shadow-md";
const MATERIALS_PANEL_RADIOACTIVE =
  "rounded-lg border border-radioactive-500/55 bg-radioactive-600/15 ring-1 ring-radioactive-400/35 shadow-[0_0_22px_rgba(234,179,8,0.14)] p-4 md:p-6 space-y-5";
/** Second half of a unified project card (below DynamicForm). */
const MATERIALS_PANEL_EMBEDDED = "border-t border-brick-700 px-6 pt-5 pb-6 space-y-5";
const MATERIALS_PANEL_EMBEDDED_RADIOACTIVE =
  "border-t border-radioactive-500/50 px-6 pt-5 pb-6 space-y-5 bg-radioactive-600/10 ring-1 ring-inset ring-radioactive-400/25 shadow-[inset_0_0_20px_rgba(234,179,8,0.06)]";
/** Slightly recessed dark well — stands out from outer `bg-brick-800` without a bright sheet. */
const MATERIALS_INNER_SURFACE =
  "rounded-md border border-brick-600/90 bg-brick-950/55 p-4 md:p-5 text-brick-200 shadow-inner ring-1 ring-brick-800/60";

export type EditorPrompt = {
  overview: string;
  stages: Array<{ name: StageName; details: string; notes: string }>;
};

export type MaterialEstimateToolbarState = {
  estimatePending: boolean;
  applyPending: boolean;
  canReset: boolean;
  /** Draft differs from last loaded server resources (materials / equipment tables). */
  resourcesDirty: boolean;
};

export type ProjectMaterialEstimateHandle = {
  /** Runs estimate using current editor text (overview + stages) and radius. */
  runEstimate: () => void;
  /** Same as the section “Regenerate” control (does not require overview text). */
  regenerateEstimate: () => void;
  applyResources: () => void;
  resetFromSaved: () => void;
  /** Persists stage resources only when the draft differs from the server snapshot. */
  applyResourcesIfDirtyAsync: () => Promise<void>;
};

function stageLabel(name: StageName): string {
  if (name === "build/install") return "Build/Install";
  if (name === "qa") return "QA (Quality Assurance)";
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

function emptyDraft(): DraftStage[] {
  return STAGE_ORDER.map((name) => ({
    name,
    materials: [],
    equipment: [],
  }));
}

function resourcesToDraft(r: ProjectStageResourcesResponse): DraftStage[] {
  const byName = new Map(r.stages.map((s) => [s.name, s] as const));
  return STAGE_ORDER.map((name) => {
    const s = byName.get(name);
    return {
      name,
      materials:
        s?.materials.map((m) => ({
          materialId: m.materialId,
          quantity: m.quantity,
          label: m.productName,
        })) ?? [],
      equipment:
        s?.equipment.map((e) => ({
          equipmentId: e.equipmentId,
          halfDay: e.halfDay,
          label: e.name,
        })) ?? [],
    };
  });
}

function draftToPutBody(draft: DraftStage[]): StageResourcesPutBody {
  return {
    stages: draft.map((s) => ({
      name: s.name,
      materials: s.materials
        .filter((m) => m.quantity > 0)
        .map((m) => ({ materialId: m.materialId, quantity: m.quantity })),
      equipment: s.equipment.map((e) => ({ equipmentId: e.equipmentId, halfDay: e.halfDay })),
    })),
  };
}

interface Props {
  projectId: string;
  getEditorPrompt: () => EditorPrompt;
  /** When true, Regenerate / Apply / Reset are omitted (e.g. shown in a page toolbar). */
  hideActionButtons?: boolean;
  onActionState?: (state: MaterialEstimateToolbarState) => void;
  /**
   * Aligns with project editor tabs: `info` hides stage tables (materials are per stage).
   * A stage name shows only that stage. Omit for legacy “all stages” view.
   */
  viewStage?: "info" | StageName;
  /** When true, no outer card — sits under DynamicForm inside one parent shell. */
  embedded?: boolean;
}

/** Mutation result — avoids throwing on informational empty-catalog cases (warnings are not errors). */
type MaterialEstimateMutationResult =
  | { status: "empty_seed" }
  | { status: "completed"; appliedViaSubmitTool: boolean };

function viewStageToTableMode(
  viewStage: "info" | StageName | undefined,
): "all" | "info" | { idx: number } {
  if (viewStage === undefined) return "all";
  if (viewStage === "info") return "info";
  const idx = STAGE_ORDER.indexOf(viewStage);
  if (idx < 0) return "all";
  return { idx };
}

export const ProjectMaterialEstimateSection = forwardRef<ProjectMaterialEstimateHandle, Props>(
  function ProjectMaterialEstimateSection(
    { projectId, getEditorPrompt, hideActionButtons = false, onActionState, viewStage, embedded = false },
    ref,
  ) {
    const queryClient = useQueryClient();
    const [radiusMiles, setRadiusMiles] = useState(50);
    const [draft, setDraft] = useState<DraftStage[]>(() => emptyDraft());
    const [warnings, setWarnings] = useState<string[]>([]);
    const [materialsPanelSurface, setMaterialsPanelSurface] = useState<"default" | "radioactive">(
      "default",
    );
    const getPromptRef = useRef(getEditorPrompt);
    useEffect(() => {
      getPromptRef.current = getEditorPrompt;
    }, [getEditorPrompt]);

    const { data: resources, isLoading: loadingResources } = useQuery({
      queryKey: ["stage-resources", projectId],
      queryFn: () => api.getStageResources(projectId),
    });

    const resetDraftFromServer = useCallback((r: ProjectStageResourcesResponse) => {
      setDraft(resourcesToDraft(r));
      setWarnings([]);
    }, []);

    useEffect(() => {
      if (!resources) return;
      queueMicrotask(() => resetDraftFromServer(resources));
    }, [resources, resetDraftFromServer]);

    const estimateMutation = useMutation<MaterialEstimateMutationResult, Error, void>({
      mutationFn: async (): Promise<MaterialEstimateMutationResult> => {
        setMaterialsPanelSurface("default");

        const p = getPromptRef.current();
        const res = await api.postMaterialEstimate(projectId, {
          radiusMiles,
          overview: p.overview,
          stages: p.stages.map((s) => ({
            name: s.name,
            details: s.details,
            notes: s.notes,
          })),
        });

        setWarnings(res.warnings ?? []);

        if (res.status === "emptyCatalog") {
          return { status: "empty_seed" };
        }

        if (res.highlightMaterialsPanel) {
          setMaterialsPanelSurface("radioactive");
        }

        if (res.appliedViaSubmitTool && res.draftStages) {
          setDraft(res.draftStages);
        }

        return { status: "completed", appliedViaSubmitTool: res.appliedViaSubmitTool };
      },
      onSuccess: (data) => {
        if (data.status === "empty_seed") {
          toast.error(
            "No materials or equipment left in range for this job site. Increase the radius (mi) or fix supplier/rental coordinates, then try again.",
            { duration: 8000 },
          );
          return;
        }
        if (!data.appliedViaSubmitTool) {
          toast.error(
            "The model did not call submit_material_estimate (it likely returned plain JSON text instead of tool_calls). The table was not updated. Use an OpenAI-compatible server that emits tool_calls, or a model that follows function-calling.",
            { duration: 12_000 },
          );
          return;
        }
        toast.success("Estimate generated. Review materials below, then save the project.");
      },
      onError: (e) => {
        const msg = e instanceof Error ? e.message : "Could not generate estimate.";
        toast.error(msg);
      },
    });

    const applyMutation = useMutation({
      mutationFn: () => api.putStageResources(projectId, draftToPutBody(draft)),
      onSuccess: () => {
        toast.success("Stage materials and equipment saved.");
        queryClient.invalidateQueries({ queryKey: ["stage-resources", projectId] });
        setWarnings([]);
      },
      onError: () => {
        toast.error("Could not save stage resources.");
      },
    });

    const mutateEstimateRef = useRef(estimateMutation.mutate);
    useEffect(() => {
      mutateEstimateRef.current = estimateMutation.mutate;
    }, [estimateMutation.mutate]);

    const applyMutateRef = useRef(applyMutation.mutate);
    useEffect(() => {
      applyMutateRef.current = applyMutation.mutate;
    }, [applyMutation.mutate]);

    const resetDraftFromServerRef = useRef(resetDraftFromServer);
    const resourcesRef = useRef(resources);
    const draftRef = useRef(draft);
    useEffect(() => {
      resetDraftFromServerRef.current = resetDraftFromServer;
    }, [resetDraftFromServer]);
    useEffect(() => {
      resourcesRef.current = resources;
    }, [resources]);
    useEffect(() => {
      draftRef.current = draft;
    }, [draft]);

    const savedResourcesPutBody = useMemo(
      () => (resources ? draftToPutBody(resourcesToDraft(resources)) : null),
      [resources],
    );
    const resourcesDirty = useMemo(() => {
      if (!savedResourcesPutBody) return false;
      return JSON.stringify(draftToPutBody(draft)) !== JSON.stringify(savedResourcesPutBody);
    }, [draft, savedResourcesPutBody]);

    const applyMutateAsyncRef = useRef(applyMutation.mutateAsync);
    useEffect(() => {
      applyMutateAsyncRef.current = applyMutation.mutateAsync;
    }, [applyMutation.mutateAsync]);

    useImperativeHandle(ref, () => ({
      runEstimate: () => {
        const p = getPromptRef.current();
        if (!p.overview.trim()) {
          toast.error("Add a project overview first.");
          return;
        }
        mutateEstimateRef.current();
      },
      regenerateEstimate: () => {
        mutateEstimateRef.current();
      },
      applyResources: () => {
        applyMutateRef.current();
      },
      resetFromSaved: () => {
        const r = resourcesRef.current;
        if (r) resetDraftFromServerRef.current(r);
      },
      applyResourcesIfDirtyAsync: async () => {
        const r = resourcesRef.current;
        if (!r) return;
        const savedBody = draftToPutBody(resourcesToDraft(r));
        if (JSON.stringify(draftToPutBody(draftRef.current)) === JSON.stringify(savedBody)) return;
        await applyMutateAsyncRef.current();
      },
    }));

    useEffect(() => {
      if (!onActionState) return;
      onActionState({
        estimatePending: estimateMutation.isPending,
        applyPending: applyMutation.isPending,
        canReset: !loadingResources && !!resources,
        resourcesDirty,
      });
    }, [
      onActionState,
      estimateMutation.isPending,
      applyMutation.isPending,
      loadingResources,
      resources,
      resourcesDirty,
    ]);

    const updateMaterialQuantity = (stageIdx: number, lineIdx: number, quantity: number) => {
      setDraft((prev) => {
        const next = prev.map((s, i) =>
          i === stageIdx
            ? {
                ...s,
                materials: s.materials.map((m, j) =>
                  j === lineIdx ? { ...m, quantity: Number.isFinite(quantity) ? quantity : m.quantity } : m,
                ),
              }
            : s,
        );
        return next;
      });
    };

    const removeMaterial = (stageIdx: number, lineIdx: number) => {
      setDraft((prev) =>
        prev.map((s, i) =>
          i === stageIdx
            ? { ...s, materials: s.materials.filter((_, j) => j !== lineIdx) }
            : s,
        ),
      );
    };

    const toggleEquipmentHalfDay = (stageIdx: number, lineIdx: number) => {
      setDraft((prev) =>
        prev.map((s, i) =>
          i === stageIdx
            ? {
                ...s,
                equipment: s.equipment.map((e, j) =>
                  j === lineIdx ? { ...e, halfDay: !e.halfDay } : e,
                ),
              }
            : s,
        ),
      );
    };

    const removeEquipment = (stageIdx: number, lineIdx: number) => {
      setDraft((prev) =>
        prev.map((s, i) =>
          i === stageIdx
            ? { ...s, equipment: s.equipment.filter((_, j) => j !== lineIdx) }
            : s,
        ),
      );
    };

    const tableMode = viewStageToTableMode(viewStage);
    const stageRows =
      tableMode === "all"
        ? draft.map((stage, si) => ({ stage, si }))
        : tableMode === "info"
          ? []
          : [{ stage: draft[tableMode.idx], si: tableMode.idx }];

    const materialsTitle =
      typeof tableMode === "object"
        ? `Materials & equipment — ${stageLabel(stageRows[0]!.stage.name)}`
        : "Materials & equipment";

    const sectionSurfaceClass = embedded
      ? materialsPanelSurface === "radioactive"
        ? MATERIALS_PANEL_EMBEDDED_RADIOACTIVE
        : MATERIALS_PANEL_EMBEDDED
      : materialsPanelSurface === "radioactive"
        ? MATERIALS_PANEL_RADIOACTIVE
        : MATERIALS_PANEL_DEFAULT;

    return (
      <section className={sectionSurfaceClass}>
        {/* Keep dynamic radioactive utility classes in the bundle */}
        <div className="hidden border-radioactive-500/55 bg-radioactive-600/15 ring-radioactive-400/35 shadow-[0_0_22px_rgba(234,179,8,0.14)]" />
        <div className="mb-1">
          <h2 className="text-base md:text-lg font-semibold text-brick-100">{materialsTitle}</h2>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs md:text-sm text-brick-300">
            Radius (mi)
            <input
              type="number"
              min={1}
              max={500}
              step={1}
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(Number(e.target.value))}
              className="rounded-md border border-brick-600 bg-brick-900 px-2 py-1.5 text-brick-100 w-24 text-sm focus:outline-none focus:ring-2 focus:ring-brick-500"
            />
          </label>
          {!hideActionButtons ? (
            <>
              <button
                type="button"
                onClick={() => estimateMutation.mutate()}
                disabled={estimateMutation.isPending}
                className="rounded bg-brick-600 hover:bg-brick-500 text-brick-50 px-3 py-2 text-xs md:text-sm font-medium disabled:opacity-50"
              >
                {estimateMutation.isPending ? "Generating…" : "Regenerate"}
              </button>
              <button
                type="button"
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
                className="rounded border border-brick-500 text-brick-200 hover:bg-brick-800 px-3 py-2 text-xs md:text-sm font-medium disabled:opacity-50"
              >
                {applyMutation.isPending ? "Saving…" : "Apply to project"}
              </button>
              <button
                type="button"
                onClick={() => resources && resetDraftFromServer(resources)}
                disabled={loadingResources || !resources}
                className="text-xs text-brick-400 hover:text-brick-200 underline disabled:opacity-50"
              >
                Reset from saved
              </button>
            </>
          ) : null}
        </div>

        <div className={`${MATERIALS_INNER_SURFACE} space-y-4 max-h-[70vh] overflow-y-auto`}>
          {warnings.length > 0 && (
            <ul className="text-xs text-amber-200/90 list-disc pl-4 space-y-0.5 border-b border-brick-700/80 pb-3">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          <div className="space-y-6 pr-1">
            {tableMode === "info" ? (
              <p className="text-sm text-brick-400 border border-brick-700 rounded-md p-4 bg-brick-900/40">
                Materials and equipment are organized by stage. Open the <strong className="text-brick-200">Demo</strong>,{" "}
                <strong className="text-brick-200">Prep</strong>, <strong className="text-brick-200">Build/Install</strong>, or{" "}
                <strong className="text-brick-200">QA</strong> tab to view and edit lines for that stage.
              </p>
            ) : null}
            {stageRows.map(({ stage, si }) => (
              <div key={stage.name} className="space-y-2">
                {typeof tableMode === "object" ? null : (
                  <h3 className="text-sm font-semibold text-brick-200">{stageLabel(stage.name)}</h3>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-brick-400 border-b border-brick-700">
                        <th className="py-1.5 pr-2 font-medium">Materials</th>
                        <th className="py-1.5 pr-2 font-medium w-24">Qty</th>
                        <th className="py-1.5 font-medium w-16" />
                      </tr>
                    </thead>
                    <tbody>
                      {stage.materials.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-2 text-brick-500">
                            None
                          </td>
                        </tr>
                      ) : (
                        stage.materials.map((m, mi) => (
                          <tr key={`${m.materialId}-${mi}`} className="border-b border-brick-800/80">
                            <td className="py-1.5 pr-2 text-brick-200">{m.label}</td>
                            <td className="py-1.5 pr-2">
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={m.quantity}
                                onChange={(e) => updateMaterialQuantity(si, mi, parseFloat(e.target.value))}
                                className="w-full rounded-md border border-brick-600 bg-brick-900 px-1.5 py-0.5 text-brick-100 text-xs focus:outline-none focus:ring-1 focus:ring-brick-500"
                              />
                            </td>
                            <td className="py-1.5">
                              <button
                                type="button"
                                onClick={() => removeMaterial(si, mi)}
                                className="text-[10px] font-medium text-red-300 hover:text-red-200"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-brick-400 border-b border-brick-700">
                        <th className="py-1.5 pr-2 font-medium">Equipment</th>
                        <th className="py-1.5 pr-2 font-medium w-20">½ day</th>
                        <th className="py-1.5 font-medium w-14" />
                      </tr>
                    </thead>
                    <tbody>
                      {stage.equipment.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-2 text-brick-500">
                            None
                          </td>
                        </tr>
                      ) : (
                        stage.equipment.map((e, ei) => (
                          <tr key={`${e.equipmentId}-${ei}`} className="border-b border-brick-800/80">
                            <td className="py-1.5 pr-2 text-brick-200">{e.label}</td>
                            <td className="py-1.5 pr-2">
                              <input
                                type="checkbox"
                                checked={e.halfDay}
                                onChange={() => toggleEquipmentHalfDay(si, ei)}
                                className="accent-brick-500"
                              />
                            </td>
                            <td className="py-1.5">
                              <button
                                type="button"
                                onClick={() => removeEquipment(si, ei)}
                                className="text-[10px] font-medium text-red-300 hover:text-red-200"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  },
);
