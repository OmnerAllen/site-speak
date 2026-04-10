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
import type { ChatCompletionMessage } from "../ai/chatCompletionTypes";
import { runOpenAiToolLoop } from "../ai/openAiToolLoop";
import { proposalToDraft, type MaterialProposal } from "../ai/materialEstimateFromTool";
import { STAGE_ORDER, type DraftStage } from "../ai/materialEstimateTypes";
import type { ProjectStageResourcesResponse, StageName, StageResourcesPutBody } from "../types";

const SUBMIT_MATERIAL_ESTIMATE = "submit_material_estimate";
const HIGHLIGHT_MATERIALS_EQUIPMENT_PANEL = "highlight_materials_equipment_panel";

/** Site Speak @theme radioactive palette — keep classes referenced for Tailwind. */
const MATERIALS_PANEL_DEFAULT =
  "rounded-xl border border-brick-700/50 bg-brick-900/40 p-4 md:p-5 space-y-5";
const MATERIALS_PANEL_RADIOACTIVE =
  "rounded-xl border border-radioactive-500/55 bg-radioactive-600/15 ring-1 ring-radioactive-400/35 shadow-[0_0_22px_rgba(234,179,8,0.14)] p-4 md:p-5 space-y-5";

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
}

/** Mutation result — avoids throwing on informational empty-catalog cases (warnings are not errors). */
type MaterialEstimateMutationResult =
  | { status: "empty_seed" }
  | { status: "completed"; appliedViaSubmitTool: boolean };

export const ProjectMaterialEstimateSection = forwardRef<ProjectMaterialEstimateHandle, Props>(
  function ProjectMaterialEstimateSection({ projectId, getEditorPrompt }, ref) {
    const queryClient = useQueryClient();
    const [radiusMiles, setRadiusMiles] = useState(50);
    const [draft, setDraft] = useState<DraftStage[]>(() => emptyDraft());
    const [warnings, setWarnings] = useState<string[]>([]);
    const [materialsPanelSurface, setMaterialsPanelSurface] = useState<"default" | "radioactive">(
      "default",
    );
    /** Set true only when the model invokes <code>submit_material_estimate</code> (not JSON-in-text). */
    const submitToolFiredRef = useRef(false);

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
        submitToolFiredRef.current = false;

        const p = getPromptRef.current();
        const seed = await api.postMaterialEstimate(projectId, {
          radiusMiles,
          overview: p.overview,
          stages: p.stages.map((s) => ({
            name: s.name,
            details: s.details,
            notes: s.notes,
          })),
        });

        setWarnings(seed.warnings ?? []);
        const rawMessages = seed.messages;

        if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
          return { status: "empty_seed" };
        }

        const allowedMat = new Set(seed.allowedMaterialIds ?? []);
        const allowedEq = new Set(seed.allowedEquipmentIds ?? []);

        const completeWithFallback = async (body: Record<string, unknown>) => {
          try {
            return await api.postAiCompletions(body);
          } catch (err) {
            if (body.tool_choice !== undefined) {
              console.warn(
                "material-estimate: postAiCompletions failed; retrying without tool_choice",
                err instanceof Error ? err.message : String(err),
              );
              const { tool_choice, ...rest } = body;
              void tool_choice;
              return await api.postAiCompletions(rest);
            }
            if (err instanceof Error) throw err;
            throw new Error(String(err));
          }
        };

        await runOpenAiToolLoop({
          initialMessages: rawMessages as ChatCompletionMessage[],
          tools: Array.isArray(seed.tools) ? seed.tools : [],
          toolChoice: seed.toolChoice,
          complete: completeWithFallback,
          onRoundResponse: ({ data }) => {
            console.log("AI Response:", data);
          },
          handlers: {
            [HIGHLIGHT_MATERIALS_EQUIPMENT_PANEL]: () => {
              setMaterialsPanelSurface("radioactive");
              return "Materials & equipment panel set to radioactive accent.";
            },
            [SUBMIT_MATERIAL_ESTIMATE]: (argsJson) => {
              submitToolFiredRef.current = true;
              let proposal: MaterialProposal;
              try {
                proposal = JSON.parse(argsJson) as MaterialProposal;
              } catch {
                throw new Error("Invalid submit_material_estimate arguments JSON.");
              }
              const next = proposalToDraft(
                proposal,
                allowedMat,
                allowedEq,
                seed.materialLabels ?? {},
                seed.equipmentLabels ?? {},
              );
              setDraft(next);
              return "Estimate applied.";
            },
          },
        });

        return { status: "completed", appliedViaSubmitTool: submitToolFiredRef.current };
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
        toast.success("Estimate generated. Review and apply when ready.");
      },
      onError: (e) => {
        const msg = e instanceof Error ? e.message : "Could not generate estimate.";
        toast.error(msg);
      },
    });

    const mutateEstimateRef = useRef(estimateMutation.mutate);
    useEffect(() => {
      mutateEstimateRef.current = estimateMutation.mutate;
    }, [estimateMutation.mutate]);

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
      <section
        className={
          materialsPanelSurface === "radioactive" ? MATERIALS_PANEL_RADIOACTIVE : MATERIALS_PANEL_DEFAULT
        }
      >
        {/* Keep dynamic radioactive utility classes in the bundle */}
        <div className="hidden border-radioactive-500/55 bg-radioactive-600/15 ring-radioactive-400/35 shadow-[0_0_22px_rgba(234,179,8,0.14)]" />
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
