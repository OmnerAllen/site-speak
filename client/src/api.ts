import type {
  Supplier,
  Equipment,
  Material,
  Project,
  ProjectDetails,
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
};
