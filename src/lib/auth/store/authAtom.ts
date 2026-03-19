import { atom } from "jotai";

export interface AuthState {
  authEnabled: boolean;
  authenticated: boolean;
  checked: boolean;
}

// Authentication is disabled — always start as authenticated.
export const authAtom = atom<AuthState>({
  authEnabled: false,
  authenticated: true,
  checked: true,
});
