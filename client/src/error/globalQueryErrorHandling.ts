import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const TOAST_DEDUPE_WINDOW_MS = 4000;
const recentToastTimes = new Map<string, number>();

type ErrorSource = "query" | "mutation";

function isGlobalErrorToastSuppressed(meta: Record<string, unknown> | undefined): boolean {
  return meta?.suppressGlobalErrorToast === true;
}

function extractStatusCode(errorMessage: string): number | null {
  const match = errorMessage.match(/Request failed:\s*(\d{3})/);
  if (!match) return null;
  const statusCode = Number(match[1]);
  return Number.isNaN(statusCode) ? null : statusCode;
}

function getUserFacingErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "Session expired") {
      return "Your session expired. Please sign in again.";
    }

    if (/Failed to fetch|NetworkError|Load failed/i.test(error.message)) {
      return "Network issue detected. Check your connection and try again.";
    }

    const statusCode = extractStatusCode(error.message);
    if (statusCode === 400) return "Your request is invalid. Please review and try again.";
    if (statusCode === 401) return "Your session expired. Please sign in again.";
    if (statusCode === 403) return "You do not have permission to perform that action.";
    if (statusCode === 404) return "The requested resource was not found.";
    if (statusCode === 409) return "A conflicting change was detected. Please refresh and retry.";
    if (statusCode !== null && statusCode >= 500) {
      return "Server is temporarily unavailable. Please try again in a moment.";
    }
  }

  return "Something went wrong. Please try again.";
}

function shouldShowErrorToast(toastKey: string): boolean {
  const now = Date.now();
  const previousTimestamp = recentToastTimes.get(toastKey);
  if (previousTimestamp && now - previousTimestamp < TOAST_DEDUPE_WINDOW_MS) {
    return false;
  }

  recentToastTimes.set(toastKey, now);
  for (const [key, timestamp] of recentToastTimes) {
    if (now - timestamp > TOAST_DEDUPE_WINDOW_MS) {
      recentToastTimes.delete(key);
    }
  }
  return true;
}

function notifyGlobalError(error: unknown, source: ErrorSource): void {
  const message = getUserFacingErrorMessage(error);
  const toastKey = `${source}:${message}`;

  if (!shouldShowErrorToast(toastKey)) {
    return;
  }

  toast.error(message, { id: toastKey });
  console.error(`[react-query:${source}]`, error);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isGlobalErrorToastSuppressed(query.meta)) {
          return;
        }
        notifyGlobalError(error, "query");
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (isGlobalErrorToastSuppressed(mutation.meta)) {
          return;
        }
        notifyGlobalError(error, "mutation");
      },
    }),
  });
}
