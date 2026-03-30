import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Survives React StrictMode double-mount so we do not double-count first_load. */
let initialLoadRecorded = false;
let lastPathSeen: string | null = null;

function postPageView(kind: "first_load" | "navigation", page: string) {
  void fetch("/api/telemetry/page-view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, page }),
    keepalive: true,
  }).catch(() => {
    /* ignore */
  });
}

/** Records full document loads vs SPA navigations for Prometheus / Grafana. */
export function usePageTelemetry() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    if (!initialLoadRecorded) {
      initialLoadRecorded = true;
      lastPathSeen = path;
      postPageView("first_load", path);
      return;
    }
    if (lastPathSeen !== path) {
      lastPathSeen = path;
      postPageView("navigation", path);
    }
  }, [location.pathname]);
}
