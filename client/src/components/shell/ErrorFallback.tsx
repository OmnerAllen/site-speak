export function ErrorFallback({ error, resetErrorBoundary }: { error: unknown; resetErrorBoundary: () => void }) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return (
    <div className="p-8 text-center">
      <p className="text-radioactive-400 mb-4">Something went wrong: {message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-brick-700 text-brick-200 rounded hover:bg-brick-600 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
