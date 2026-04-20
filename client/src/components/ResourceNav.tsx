import type { ReactNode } from "react";
import { TabNav } from "./TabNav";
import { RESOURCE_NAV_ITEMS } from "./navigation";

type ResourceNavProps = {
  /** Shown on the same row as the sub-tabs (right side); e.g. “+ Add …” on desktop. */
  action?: ReactNode;
};

export function ResourceNav({ action }: ResourceNavProps) {
  return (
    <>
      <div className="mb-6 pb-2 border-b border-brick-800 hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-3">
        <div aria-hidden className="min-w-0" />
        <TabNav items={RESOURCE_NAV_ITEMS} className="justify-center gap-4 min-w-0" />
        <div className="flex justify-end items-center min-w-0">{action}</div>
      </div>
      {action ? (
        <div className="mb-6 pb-2 border-b border-brick-800 flex justify-end sm:hidden">{action}</div>
      ) : null}
    </>
  );
}