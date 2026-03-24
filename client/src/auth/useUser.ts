import { createContext, useContext } from "react";
import type { UserProfile } from "../types";

export interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

export const UserContext = createContext<UserContextType>({
  profile: null,
  loading: true,
  hasRole: () => false,
  hasPermission: () => false,
});

export const useUser = () => useContext(UserContext);
