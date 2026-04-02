import React, { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const activeUnderline = active && mounted;

  const baseClasses =
    "relative px-3 py-1.5 rounded-sm text-sm font-medium transition-colors " +
    "after:content-[''] after:absolute after:left-0 after:-bottom-1 " +
    "after:w-full after:h-1 after:bg-grass-400 " +
    "after:origin-center after:transition-transform after:duration-300 after:ease-out ";

  const statusClasses = active
    ? "text-grass-400 " + (activeUnderline ? "after:scale-x-100" : "after:scale-x-0")
    : "text-brick-300 hover:text-brick-100 hover:bg-brick-800/50 after:scale-x-0";

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
    <div className={`flex items-center ${className}`}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} activePaths={item.activePaths}>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
