import type { NavItem } from "./TabNav";

export const MAIN_NAV_ITEMS: NavItem[] = [
  { to: "/projects", label: "Projects" },
  { to: "/schedule", label: "Schedule" },
  { to: "/employees", label: "Employees" },
  { to: "/suppliers", label: "Resource Management", activePaths: ["/materials", "/equipment"] },
];
