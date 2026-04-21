import { useAuth } from "react-oidc-context";
import { Navigate } from "react-router-dom";

export default function Login() {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <p className="text-brick-300 animate-pulse text-lg">Loading...</p>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
      <h1 className="text-4xl font-bold text-brick-100 mb-3">Site Speak</h1>
      <p className="text-brick-400 mb-10 max-w-md">
        Construction project management, work logs, and scheduling.
      </p>
      <button
        onClick={() => auth.signinRedirect()}
        className="bg-grass-700 hover:bg-grass-600 text-grass-50 font-semibold px-8 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-grass-400 focus:ring-offset-2 focus:ring-offset-brick-950 cursor-pointer"
      >
        Log in with Keycloak
      </button>
    </div>
  );
}
