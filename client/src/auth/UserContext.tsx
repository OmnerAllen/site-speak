import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { fetchMe } from "../api";
import type { UserProfile } from "../types";

interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const UserContext = createContext<UserContextType>({
  profile: null,
  loading: true,
  hasRole: () => false,
  hasPermission: () => false,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[UserContext] auth state:", {
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading,
      hasIdToken: !!auth.user?.id_token,
      tokenLength: auth.user?.id_token?.length ?? 0,
      error: auth.error?.message,
    });

    if (auth.isAuthenticated && auth.user?.id_token) {
      document.cookie = `id_token=${auth.user.id_token}; path=/; SameSite=Strict`;
      console.log("[UserContext] Cookie set. Current cookies:", document.cookie.substring(0, 100));

      fetchMe()
        .then((p) => {
          console.log("[UserContext] fetchMe succeeded:", p);
          setProfile(p);
        })
        .catch((err) => {
          console.error("[UserContext] fetchMe FAILED:", err);
        })
        .finally(() => setLoading(false));
    } else if (!auth.isLoading) {
      console.log("[UserContext] Not authenticated and not loading");
      setLoading(false);
    }
  }, [auth.isAuthenticated, auth.user?.id_token, auth.isLoading]);

  const hasRole = (role: string) => profile?.roles.includes(role) ?? false;
  const hasPermission = (perm: string) =>
    profile?.permissions.includes(perm) ?? false;

  return (
    <UserContext.Provider value={{ profile, loading, hasRole, hasPermission }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
