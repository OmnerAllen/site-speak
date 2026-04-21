import type { NavItem } from "./TabNav";

export const MAIN_NAV_ITEMS: NavItem[] = [
  { to: "/projects", label: "Projects" },
  { to: "/schedule", label: "Schedule" },
  { to: "/employees", label: "Employees" },
  { to: "/suppliers", label: "Resource Management", activePaths: ["/materials", "/equipment"] },
];

export const RESOURCE_NAV_ITEMS: NavItem[] = [
  { to: "/suppliers", label: "Suppliers" },
  { to: "/materials", label: "Materials" },
  { to: "/equipment", label: "Equipment" },
];
