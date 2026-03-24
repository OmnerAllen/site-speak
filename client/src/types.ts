export interface Project {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  updatedAt: string;
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
