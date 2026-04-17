import type {
  Supplier,
  SupplierUpsertBody,
  Equipment,
  Material,
  Project,
  ProjectDetails,
  ProjectStageResourcesResponse,
  ScheduleProject,
  Employee,
  WorkLog,
  WorkLogDraft,
  MaterialEstimateRequestBody,
  MaterialEstimateCompleteResponse,
  StageResourcesPutBody,
  AiChatMessage,
} from "./types";
import { ApiError } from "./error/ApiError";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    document.cookie = "id_token=; path=/; max-age=0";
    window.location.href = "/";
    throw new ApiError("Session expired", 401);
  }

  if (!res.ok) {
    let errorDetails;
    try {
      errorDetails = await res.json();
    } catch {
      // Not JSON
    }
    const message = errorDetails?.title || errorDetails?.detail || errorDetails?.message || `Request failed: ${res.status}`;
    throw new ApiError(message, res.status, errorDetails);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getSuppliers: () => apiFetch<Supplier[]>("/suppliers"),
  createSupplier: (body: SupplierUpsertBody) =>
    apiFetch<Supplier>("/suppliers", { method: "POST", body: JSON.stringify(body) }),
  updateSupplier: (id: string, body: SupplierUpsertBody) =>
    apiFetch<Supplier>(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteSupplier: (id: string) =>
    apiFetch<void>(`/suppliers/${id}`, { method: "DELETE" }),

  getEquipment: () => apiFetch<Equipment[]>("/equipment"),
  createEquipment: (body: {
    name: string;
    costPerDay: number;
    costHalfDay: number;
    rentalSupplierId: string;
  }) =>
    apiFetch<Equipment>("/equipment", { method: "POST", body: JSON.stringify(body) }),
  updateEquipment: (
    id: string,
    body: {
      name: string;
      costPerDay: number;
      costHalfDay: number;
      rentalSupplierId: string;
    },
  ) =>
    apiFetch<Equipment>(`/equipment/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteEquipment: (id: string) =>
    apiFetch<void>(`/equipment/${id}`, { method: "DELETE" }),

  getMaterials: () => apiFetch<Material[]>("/materials"),
  createMaterial: (body: Omit<Material, "id">) =>
    apiFetch<Material>("/materials", { method: "POST", body: JSON.stringify(body) }),
  updateMaterial: (id: string, body: Omit<Material, "id">) =>
    apiFetch<Material>(`/materials/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteMaterial: (id: string) =>
    apiFetch<void>(`/materials/${id}`, { method: "DELETE" }),

  getProjects: () => apiFetch<Project[]>("/my/projects"),
  getSchedule: () => apiFetch<ScheduleProject[]>("/my/schedule"),
  getProjectDetails: (id: string) =>
    apiFetch<ProjectDetails>(`/my/projects/${id}/details`),
  createProject: (body: { name: string; address: string; overview?: string }) =>
    apiFetch<Project>("/my/projects", { method: "POST", body: JSON.stringify(body) }),
  updateProject: (id: string, body: { name: string; address: string; overview?: string }) =>
    apiFetch<Project>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  updateProjectDetails: (
    id: string,
    body: {
      name: string;
      address: string;
      overview: string;
      stages: Array<{
        name: "demo" | "prep" | "build/install" | "qa";
        details: string;
        notes: string;
      }>;
    },
  ) => apiFetch<void>(`/my/projects/${id}/details`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProject: (id: string) =>
    apiFetch<void>(`/projects/${id}`, { method: "DELETE" }),

  getStageResources: (projectId: string) =>
    apiFetch<ProjectStageResourcesResponse>(`/my/projects/${projectId}/stage-resources`),

  putStageResources: (projectId: string, body: StageResourcesPutBody) =>
    apiFetch<void>(`/my/projects/${projectId}/stage-resources`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  postMaterialEstimate: (projectId: string, body: MaterialEstimateRequestBody) =>
    apiFetch<MaterialEstimateCompleteResponse>(`/my/projects/${projectId}/material-estimate`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Lightweight chat to the configured LLM (no full material/equipment catalogs). */
  postAiChat: async (body: { messages: AiChatMessage[] }) => {
    const res = await fetch(`/api/my/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      document.cookie = "id_token=; path=/; max-age=0";
      window.location.href = "/";
      throw new Error("Session expired");
    }
    if (!res.ok) {
      let msg = `Request failed: ${res.status}`;
      try {
        const j = (await res.json()) as { error?: string };
        if (j?.error) msg = j.error;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return res.json() as Promise<{ reply: string }>;
  },

  patchProjectSchedule: (
    id: string,
    body: {
      stages: Array<{
        stageId: string;
        plannedStartDate: string | null;
        plannedEndDate: string | null;
      }>;
    },
  ) =>
    apiFetch<Project>(`/my/projects/${id}/schedule`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  getEmployees: () => apiFetch<Employee[]>("/my/employees"),
  createEmployee: (body: Omit<Employee, "id">) =>
    apiFetch<Employee>("/my/employees", { method: "POST", body: JSON.stringify(body) }),
  updateEmployee: (id: string, body: Omit<Employee, "id">) =>
    apiFetch<Employee>(`/my/employees/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteEmployee: (id: string) =>
    apiFetch<void>(`/my/employees/${id}`, { method: "DELETE" }),

  getWorkLogs: () => apiFetch<WorkLog[]>("/my/work-logs"),
  
  parseAudioWorkLog: async (audioBlob: Blob, language: string = "auto", prompt: string = ""): Promise<{ text: string }> => {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("language", language);
    formData.append("prompt", prompt);
    const res = await fetch("/api/my/work-logs/transcribe-chunk", {
      method: "POST",
      body: formData,
    });
    if (res.status === 401) {
      document.cookie = "id_token=; path=/; max-age=0";
      window.location.href = "/";
      throw new Error("Unauthorized");
    }
    
    const data = await res.json();
    return data;
  },

  parseTextWorkLog: async (transcript: string): Promise<{ draft: WorkLogDraft; transcript: string }> => {
    const res = await fetch("/api/my/work-logs/parse-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    if (res.status === 401) {
      document.cookie = "id_token=; path=/; max-age=0";
      window.location.href = "/";
      throw new Error("Unauthorized");
    }
    const data = await res.json();
    if (!res.ok) {
      throw new ApiError(data.error || "Failed to parse text", res.status);
    }
    return data;
  },

  createWorkLog: (body: {
    employeeId: string;
    projectId: string;
    startedAt: string;
    endedAt: string;
    notes?: string | null;
  }) =>
    apiFetch<WorkLog>("/my/work-logs", {
      method: "POST",
      body: JSON.stringify({
        employeeId: body.employeeId,
        projectId: body.projectId,
        startedAt: body.startedAt,
        endedAt: body.endedAt,
        notes: body.notes ?? null,
      }),
    }),
  updateWorkLog: (
    id: string,
    body: {
      employeeId: string;
      projectId: string;
      startedAt: string;
      endedAt: string;
      notes?: string | null;
    },
  ) =>
    apiFetch<WorkLog>(`/my/work-logs/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        employeeId: body.employeeId,
        projectId: body.projectId,
        startedAt: body.startedAt,
        endedAt: body.endedAt,
        notes: body.notes ?? null,
      }),
    }),
  deleteWorkLog: (id: string) =>
    apiFetch<void>(`/my/work-logs/${id}`, { method: "DELETE" }),
};
