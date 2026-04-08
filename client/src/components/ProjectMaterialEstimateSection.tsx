import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";
import type {
  MaterialEstimateResponse,
  ProjectStageResourcesResponse,
  StageName,
  StageResourcesPutBody,
} from "../types";

const STAGE_ORDER: StageName[] = ["demo", "prep", "build/install", "qa"];

export type EditorPrompt = {
  overview: string;
  stages: Array<{ name: StageName; details: string; notes: string }>;
};

export type ProjectMaterialEstimateHandle = {
  /** Runs estimate using current editor text (overview + stages) and radius. */
  runEstimate: () => void;
};

function stageLabel(name: StageName): string {
  if (name === "build/install") return "Build/Install";
  if (name === "qa") return "QA (Quality Assurance)";
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

type DraftStage = {
  name: StageName;
  materials: Array<{ materialId: string; quantity: number; label: string }>;
  equipment: Array<{ equipmentId: string; halfDay: boolean; label: string }>;
};

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

function estimateToDraft(r: MaterialEstimateResponse): DraftStage[] {
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
}

export const ProjectMaterialEstimateSection = forwardRef<ProjectMaterialEstimateHandle, Props>(
  function ProjectMaterialEstimateSection({ projectId, getEditorPrompt }, ref) {
    const queryClient = useQueryClient();
    const [radiusMiles, setRadiusMiles] = useState(50);
    const [draft, setDraft] = useState<DraftStage[]>(() => emptyDraft());
    const [warnings, setWarnings] = useState<string[]>([]);

    const getPromptRef = useRef(getEditorPrompt);
    getPromptRef.current = getEditorPrompt;

    const { data: resources, isLoading: loadingResources } = useQuery({
      queryKey: ["stage-resources", projectId],
      queryFn: () => api.getStageResources(projectId),
    });

    const resetDraftFromServer = useCallback((r: ProjectStageResourcesResponse) => {
      setDraft(resourcesToDraft(r));
      setWarnings([]);
    }, []);

    useEffect(() => {
      if (resources) resetDraftFromServer(resources);
    }, [resources, resetDraftFromServer]);

    const estimateMutation = useMutation({
      mutationFn: () => {
        const p = getPromptRef.current();
        return api.postMaterialEstimate(projectId, {
          radiusMiles,
          overview: p.overview,
          stages: p.stages.map((s) => ({
            name: s.name,
            details: s.details,
            notes: s.notes,
          })),
        });
      },
      onSuccess: (data) => {
        setDraft(estimateToDraft(data));
        setWarnings(data.warnings ?? []);
        if (data.llmRawContent) {
          // Dev-only echo from API; use to fix prompts or parser when estimates fail.
          console.info("[material-estimate] LLM message content:\n", data.llmRawContent);
        }
        toast.success("Estimate generated. Review and apply when ready.");
      },
      onError: () => {
        toast.error("Could not generate estimate.");
      },
    });

    const mutateEstimateRef = useRef(estimateMutation.mutate);
    mutateEstimateRef.current = estimateMutation.mutate;

    useImperativeHandle(ref, () => ({
      runEstimate: () => {
        const p = getPromptRef.current();
        if (!p.overview.trim()) {
          toast.error("Add a project overview first.");
          return;
        }
        mutateEstimateRef.current();
      },
    }));

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

    return (
      <section className="rounded-xl border border-brick-700/50 bg-brick-900/40 p-4 md:p-5 space-y-5">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-brick-100">Materials &amp; equipment</h2>
          <p className="text-xs md:text-sm text-brick-400 mt-1">
            Tab out of <strong className="text-brick-300">Project Overview</strong> to generate an estimate from your draft text.
            Set a radius in miles—the model is asked to prefer suppliers and rentals within that range of the job address (judged from text, not GPS).
          </p>
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
              className="rounded border border-brick-600 bg-brick-950 px-2 py-1.5 text-brick-100 w-24 text-sm"
            />
          </label>
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
        </div>

        {warnings.length > 0 && (
          <ul className="text-xs text-amber-200/90 list-disc pl-4 space-y-0.5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {draft.map((stage, si) => (
            <div key={stage.name} className="space-y-2">
              <h3 className="text-sm font-medium text-brick-200">{stageLabel(stage.name)}</h3>
              <div className="overflow-x-auto">
                <p className="text-[10px] text-brick-500 mb-0.5">Materials</p>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="text-brick-400 border-b border-brick-700">
                      <th className="py-1 pr-2 font-medium">Product</th>
                      <th className="py-1 pr-2 font-medium w-24">Qty</th>
                      <th className="py-1 font-medium w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {stage.materials.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-1 text-brick-500">
                          None
                        </td>
                      </tr>
                    ) : (
                      stage.materials.map((m, mi) => (
                        <tr key={`${m.materialId}-${mi}`} className="border-b border-brick-800/80">
                          <td className="py-1 pr-2 text-brick-200">{m.label}</td>
                          <td className="py-1 pr-2">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={m.quantity}
                              onChange={(e) => updateMaterialQuantity(si, mi, parseFloat(e.target.value))}
                              className="w-full rounded border border-brick-600 bg-brick-950 px-1 py-0.5 text-brick-100 text-xs"
                            />
                          </td>
                          <td className="py-1">
                            <button
                              type="button"
                              onClick={() => removeMaterial(si, mi)}
                              className="text-[10px] text-red-300 hover:text-red-200"
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
              <div className="overflow-x-auto">
                <p className="text-[10px] text-brick-500 mb-0.5">Equipment</p>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="text-brick-400 border-b border-brick-700">
                      <th className="py-1 pr-2 font-medium">Equipment</th>
                      <th className="py-1 pr-2 font-medium w-20">½ day</th>
                      <th className="py-1 font-medium w-14" />
                    </tr>
                  </thead>
                  <tbody>
                    {stage.equipment.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-1 text-brick-500">
                          None
                        </td>
                      </tr>
                    ) : (
                      stage.equipment.map((e, ei) => (
                        <tr key={`${e.equipmentId}-${ei}`} className="border-b border-brick-800/80">
                          <td className="py-1 pr-2 text-brick-200">{e.label}</td>
                          <td className="py-1 pr-2">
                            <input
                              type="checkbox"
                              checked={e.halfDay}
                              onChange={() => toggleEquipmentHalfDay(si, ei)}
                              className="accent-brick-500"
                            />
                          </td>
                          <td className="py-1">
                            <button
                              type="button"
                              onClick={() => removeEquipment(si, ei)}
                              className="text-[10px] text-red-300 hover:text-red-200"
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
      </section>
    );
  },
);
