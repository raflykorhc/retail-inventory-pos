import { create } from "zustand";
import { persist } from "zustand/middleware";
import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();

export type Role = "OWNER" | "CASHIER" | "ADMIN" | "MANAGER";

export const isOwnerRole = (role?: string | null): boolean => {
  if (!role) return false;
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
};

export const isCashierRole = (role?: string | null): boolean => {
  return role === "CASHIER";
};

export const getRoleDisplayName = (role?: string | null): string => {
  if (isOwnerRole(role)) return "Pemilik Usaha";
  if (isCashierRole(role)) return "Kasir";
  return "Pengguna";
};

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => {
        // Pembersihan Cache TanStack Query agar data sensitif tidak bocor
        queryClient.clear();
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
    }
  )
);
