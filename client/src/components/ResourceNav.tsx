import { TabNav } from "./TabNav";
import { RESOURCE_NAV_ITEMS } from "./navigation";

export function ResourceNav() {
  return (
    <div className="hidden sm:block">
      <TabNav
        items={RESOURCE_NAV_ITEMS}
        className="justify-center gap-4 mb-6 pb-2 border-b border-brick-800"
      />
    </div>
  );
}