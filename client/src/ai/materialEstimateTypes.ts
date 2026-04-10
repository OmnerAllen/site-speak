import type { StageName } from "../types";

export const STAGE_ORDER: StageName[] = ["demo", "prep", "build/install", "qa"];

export type DraftStage = {
  name: StageName;
  materials: Array<{ materialId: string; quantity: number; label: string }>;
  equipment: Array<{ equipmentId: string; halfDay: boolean; label: string }>;
};
