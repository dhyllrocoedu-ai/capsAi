import { create } from "zustand";
import * as authRepo from "@/lib/repositories/authRepo";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  initialized: boolean;
  /** Reads the persisted session synchronously (used by router guards too). */
  initialize: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  guestLogin: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,

  initialize: () => {
    set({ user: authRepo.getSessionUser(), initialized: true });
  },

  login: async (email, password) => {
    const user = await authRepo.login(email, password);
    set({ user });
  },

  register: async (fullName, email, password) => {
    const user = await authRepo.register(email, fullName, password);
    set({ user });
  },

  logout: () => {
    authRepo.logout();
    set({ user: null });
  },

  guestLogin: () => {
    const guest = authRepo.guestLogin();
    set({ user: guest });
  },
}));

/** Non-hook accessor for guards running outside React render flow. */
export function isAuthenticated(): boolean {
  return authRepo.getSessionUser() !== null;
}
