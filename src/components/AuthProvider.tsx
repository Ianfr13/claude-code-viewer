import { useAtomValue } from "jotai";
import type { FC, PropsWithChildren } from "react";
import { authAtom } from "../lib/auth/store/authAtom";

// Authentication is disabled — AuthProvider is a passthrough, no HTTP check needed.
export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  return <>{children}</>;
};

export const useAuth = () => {
  const authState = useAtomValue(authAtom);

  return {
    authEnabled: authState.authEnabled,
    isAuthenticated: authState.authenticated,
    checked: authState.checked,
    login: async (_password: string) => {},
    logout: async () => {},
  };
};
