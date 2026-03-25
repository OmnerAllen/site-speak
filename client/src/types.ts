export interface Project {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  updatedAt: string;
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

export type FormFieldType = "small-text" | "large-text" | "time" | "number";

export interface FormFieldConfig {
  type: FormFieldType;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
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
