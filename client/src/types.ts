export interface Project {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export type FormFieldType = "small-text" | "large-text" | "time";

export interface FormFieldConfig {
  type: FormFieldType;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
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
