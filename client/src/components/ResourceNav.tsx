import { TabNav, type NavItem } from "./TabNav";

const RESOURCE_NAV_ITEMS: NavItem[] = [
  { to: "/suppliers", label: "Suppliers" },
  { to: "/materials", label: "Materials" },
  { to: "/equipment", label: "Equipment" },
];

export function ResourceNav() {
  return (
    <TabNav
      items={RESOURCE_NAV_ITEMS}
      className="justify-center gap-4 mb-6 pb-2 border-b border-brick-800"
    />
  );
}