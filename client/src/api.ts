import type {
  Supplier,
  Equipment,
  Material,
  Project,
  ProjectDetails,
  ScheduleProject,
  Employee,
  WorkLog,
} from "./types";

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
    throw new Error("Session expired");
  }

  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getSuppliers: () => apiFetch<Supplier[]>("/suppliers"),
  createSupplier: (body: Omit<Supplier, "id">) =>
    apiFetch<Supplier>("/suppliers", { method: "POST", body: JSON.stringify(body) }),
  updateSupplier: (id: string, body: Omit<Supplier, "id">) =>
    apiFetch<Supplier>(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteSupplier: (id: string) =>
    apiFetch<void>(`/suppliers/${id}`, { method: "DELETE" }),

  getEquipment: () => apiFetch<Equipment[]>("/equipment"),
  createEquipment: (body: Omit<Equipment, "id">) =>
    apiFetch<Equipment>("/equipment", { method: "POST", body: JSON.stringify(body) }),
  updateEquipment: (id: string, body: Omit<Equipment, "id">) =>
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
