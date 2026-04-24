import React from "react";
import { Link, useLocation } from "react-router-dom";

export interface NavItem {
  to: string;
  label: string;
  activePaths?: string[];
}

function isActiveRoute(pathname: string, to: string, activePaths?: string[]) {
  return (
    pathname === to ||
    (to !== "/" && pathname.startsWith(to)) ||
    (activePaths?.some((p) => pathname.startsWith(p)) ?? false)
  );
}

export function NavLink({ to, activePaths, children }: { to: string; activePaths?: string[]; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const active = isActiveRoute(pathname, to, activePaths);

  const baseClasses =
    "shrink-0 px-3 py-2 rounded-md text-sm font-medium transition-colors ";

  const statusClasses = active
    ? "text-grass-400 bg-brick-900/40"
    : "text-brick-200 hover:text-brick-100 hover:bg-brick-900/30";

  return (
    <Link to={to} className={`${baseClasses}${statusClasses}`}>
      {children}
    </Link>
  );
}

export interface TabNavProps {
  items: NavItem[];
  className?: string;
}

export function TabNav({ items, className = "" }: TabNavProps) {
  return (
    <div className={`flex items-stretch gap-0.5 min-w-0 ${className}`}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} activePaths={item.activePaths}>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
