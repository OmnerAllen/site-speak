import React from "react";
import { Link, useLocation } from "react-router-dom";

export interface NavItem {
  to: string;
  label: string;
  activePaths?: string[];
}

export function NavLink({ to, activePaths, children }: { to: string; activePaths?: string[]; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const active =
    pathname === to ||
    (to !== "/" && pathname.startsWith(to)) ||
    (activePaths?.some((p) => pathname.startsWith(p)));
  return (
    <Link
      to={to}
      className={`relative px-3 py-1.5 rounded-sm text-sm font-medium transition-colors
        after:content-[''] after:absolute after:left-0 after:-bottom-1
        after:w-full after:h-1 after:bg-grass-400
        after:origin-center after:transition-transform after:duration-300 after:ease-out
        ${
          active
            ? "text-grass-400 after:scale-x-100"
            : "text-brick-300 hover:text-brick-100 hover:bg-brick-800/50 after:scale-x-0"
        }`}
    >
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
    <div className={`flex items-center ${className}`}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} activePaths={item.activePaths}>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
