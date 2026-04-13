export interface Project {
  id: string;
  name: string;
  address: string;
  overview: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
}

export interface Employee {
  id: string;
  name: string;
  type: "admin" | "worker";
}

export interface WorkLog {
  id: string;
  employeeId: string;
  projectId: string;
  employeeName: string;
  projectName: string;
  startedAt: string;
  endedAt: string;
  notes: string | null;
}

export interface WorkLogDraft {
  projectId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  notes: string | null;
}

export interface ProjectStage {
  id: string;
  name: "demo" | "prep" | "build/install" | "qa";
  details: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
}

/** Project + stages with planned dates for the schedule page (GET /my/schedule). */
export interface ScheduleProject {
  id: string;
  name: string;
  address: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  stages: ScheduleStage[];
}

export interface ScheduleStage {
  id: string;
  name: ProjectStage["name"];
  plannedStartDate: string | null;
  plannedEndDate: string | null;
}

export interface ProjectDetails {
  id: string;
  name: string;
  address: string;
  overview: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  stages: ProjectStage[];
}

export interface Material {
  id: string;
  productName: string;
  supplierName: string;
  unit: string;
  productType: string;
  pricePerUnit: number;
}

export interface Equipment {
  id: string;
  name: string;
  costPerDay: number;
  costHalfDay: number;
  rentalSupplierId: string | null;
  rentalSupplierName: string;
  rentalSupplierLatitude: number | null;
  rentalSupplierLongitude: number | null;
}

export interface Supplier {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
}

/** POST/PUT /suppliers; server geocodes address and sets latitude/longitude. */
export type SupplierUpsertBody = Pick<Supplier, "name" | "address" | "phone">;

export type FormFieldType =
  | "small-text"
  | "large-text"
  | "time"
  | "number"
  | "phone"
  | "select"
  | "date"
  | "datetime-local"
  | "money"
  | "heading";

export interface FormFieldConfig {
  type: FormFieldType;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  options?: { value: string; label: string }[];
  /** Shown under the label for `heading` fields. */
  description?: string;
}

export type StageName = "demo" | "prep" | "build/install" | "qa";

export interface ProjectStageResourcesResponse {
  stages: Array<{
    name: StageName;
    materials: Array<{ materialId: string; productName: string; quantity: number }>;
    equipment: Array<{ equipmentId: string; name: string; halfDay: boolean; dateOfUse: string }>;
  }>;
}

export interface StageResourcesPutBody {
  stages: Array<{
    name: StageName;
    materials: Array<{ materialId: string; quantity: number }>;
    equipment: Array<{ equipmentId: string; halfDay: boolean }>;
  }>;
}

/** Body for POST /material-estimate (optional text overrides unsaved editor content). */
export interface MaterialEstimateRequestBody {
  /** Server-side distance filter (miles) before calling the model. Default 50. */
  radiusMiles?: number;
  overview?: string;
  stages?: Array<{ name: string; details?: string; notes?: string }>;
}

/** POST /my/ai/chat — small payload; uses the API `Llm` config. */
export type AiChatRole = "system" | "user" | "assistant";

export interface AiChatMessage {
  role: AiChatRole;
  content: string;
}

/** POST /material-estimate — server runs the LLM tool loop and returns draft rows. */
export type MaterialEstimateCompleteStatus = "ok" | "emptyCatalog";

export interface MaterialEstimateDraftStageDto {
  name: StageName;
  materials: Array<{ materialId: string; quantity: number; label: string }>;
  equipment: Array<{ equipmentId: string; halfDay: boolean; label: string }>;
}

export interface MaterialEstimateCompleteResponse {
  warnings: string[];
  status: MaterialEstimateCompleteStatus;
  highlightMaterialsPanel: boolean;
  appliedViaSubmitTool: boolean;
  draftStages: MaterialEstimateDraftStageDto[] | null;
}

export interface UserProfile {
  id: string;
  keycloakSub: string;
  email: string;
  employeeId: string | null;
  companyId: string | null;
  companyName: string | null;
  roles: string[];
  permissions: string[];
}
