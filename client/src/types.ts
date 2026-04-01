export interface Project {
  id: string;
  name: string;
  address: string;
  overview: string;
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
  currency: string;
}

export interface Equipment {
  id: string;
  name: string;
  costPerDay: number;
  costHalfDay: number;
  placeToRentFrom: string;
}

export interface Supplier {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export type FormFieldType =
  | "small-text"
  | "large-text"
  | "time"
  | "number"
  | "phone"
  | "select"
  | "date"
  | "datetime-local";

export interface FormFieldConfig {
  type: FormFieldType;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  options?: { value: string; label: string }[];
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
