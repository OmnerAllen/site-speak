import type { Company, Project } from "./types";

const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
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
