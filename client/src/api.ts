import type { Company, Project, UserProfile } from "./types";

const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const url = `${BASE}${path}`;
  console.log(`[api] GET ${url} — cookies present:`, document.cookie.includes("id_token"));
  const res = await fetch(url);
  console.log(`[api] GET ${url} → ${res.status} ${res.statusText}`);
  if (res.status === 401) {
    const body = await res.text();
    console.error(`[api] 401 response body:`, body);
    document.cookie = "id_token=; path=/; max-age=0";
    window.location.href = "/";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function fetchMe(): Promise<UserProfile> {
  return get<UserProfile>("/me");
}

export function fetchCompanies(): Promise<Company[]> {
  return get<Company[]>("/companies");
}

export function fetchCompany(id: string): Promise<Company> {
  return get<Company>(`/companies/${id}`);
}

export function fetchCompanyProjects(companyId: string): Promise<Project[]> {
  return get<Project[]>(`/companies/${companyId}/projects`);
}

export function fetchMyProjects(): Promise<Project[]> {
  return get<Project[]>("/my/projects");
}
