import { useEffect, useRef } from "react";
import { useAuth } from "react-oidc-context";
import { useUser } from "./useUser";

interface Props {
  children: React.ReactNode;
  roles?: string[];
}

export function ProtectedRoute({ children, roles }: Props) {
  const auth = useAuth();
  const { profile, loading } = useUser();
  const redirecting = useRef(false);

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated && !redirecting.current) {
      redirecting.current = true;
      auth.signinRedirect();
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  if (auth.isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-brick-300 animate-pulse text-lg">Loading...</p>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return null;
  }

  if (roles && profile && !roles.some((r) => profile.roles.includes(r))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <h1 className="text-3xl font-bold text-brick-300 mb-4">
          Access Denied
        </h1>
        <p className="text-brick-400">
          You don't have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
