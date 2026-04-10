import type { StageName } from "../types";
import type { DraftStage } from "./materialEstimateTypes";
import { STAGE_ORDER } from "./materialEstimateTypes";

export type MaterialProposal = {
  stages?: Array<{
    name?: string;
    materials?: Array<{ materialId?: string; quantity?: number; note?: string | null }>;
    equipment?: Array<{ equipmentId?: string; halfDay?: boolean; note?: string | null }>;
  }>;
};

export function normalizeStageName(name: string): StageName | null {
  const n = name.trim().toLowerCase();
  if (n === "demo" || n === "prep" || n === "qa") return n as StageName;
  if (n === "build/install" || n === "build" || n === "install" || n === "build-install") return "build/install";
  return null;
}

/** Map validated tool JSON to editable draft rows (labels from server-provided maps). */
export function proposalToDraft(
  proposal: MaterialProposal,
  allowedMaterialIds: Set<string>,
  allowedEquipmentIds: Set<string>,
  materialLabels: Record<string, string>,
  equipmentLabels: Record<string, string>,
): DraftStage[] {
  const merged = new Map<StageName, NonNullable<MaterialProposal["stages"]>[number]>();
  for (const s of proposal.stages ?? []) {
    const key = s.name ? normalizeStageName(s.name) : null;
    if (key) merged.set(key, s);
  }

  return STAGE_ORDER.map((name) => {
    const s = merged.get(name);
    return {
      name,
      materials: (s?.materials ?? [])
        .filter(
          (m): m is { materialId: string; quantity: number; note?: string | null } =>
            typeof m.materialId === "string" &&
            typeof m.quantity === "number" &&
            allowedMaterialIds.has(m.materialId) &&
            m.quantity > 0,
        )
        .map((m) => ({
          materialId: m.materialId,
          quantity: m.quantity,
          label: materialLabels[m.materialId] ?? m.materialId,
        })),
      equipment: (s?.equipment ?? [])
        .filter(
          (e): e is { equipmentId: string; halfDay: boolean; note?: string | null } =>
            typeof e.equipmentId === "string" &&
            typeof e.halfDay === "boolean" &&
            allowedEquipmentIds.has(e.equipmentId),
        )
        .map((e) => ({
          equipmentId: e.equipmentId,
          halfDay: e.halfDay,
          label: equipmentLabels[e.equipmentId] ?? e.equipmentId,
        })),
    };
  });
}
