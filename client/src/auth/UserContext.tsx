import { useAuth } from "react-oidc-context";
import { useQuery } from "@tanstack/react-query";
import { UserContext } from "./useUser";
import type { UserProfile } from "../types";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const token = auth.user?.id_token;
  const enabled = auth.isAuthenticated && !!token;

  const { data: profile = null, isLoading } = useQuery({
    queryKey: ["me", token],
    queryFn: async (): Promise<UserProfile> => {
      document.cookie = `id_token=${token}; path=/; SameSite=Strict`;
      const res = await fetch("/api/me");
      if (res.status === 401) {
        document.cookie = "id_token=; path=/; max-age=0";
        window.location.href = "/";
        throw new Error("Session expired");
      }
      if (!res.ok) throw new Error(`Failed to load profile: ${res.status}`);
      return res.json();
    },
    enabled,
  });

  const loading = auth.isLoading || (enabled && isLoading);
  const hasRole = (role: string) => profile?.roles.includes(role) ?? false;
  const hasPermission = (perm: string) =>
    profile?.permissions.includes(perm) ?? false;

  return (
    <UserContext.Provider value={{ profile, loading, hasRole, hasPermission }}>
      {children}
    </UserContext.Provider>
  );
}
