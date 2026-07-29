import { ReactNode } from "react";
import { useAuthStore, Role } from "../../store/useAuthStore";

interface CanProps {
  children: ReactNode;
  role?: Role | Role[];
}

/**
 * Komponen RBAC untuk menyembunyikan/menampilkan elemen berdasarkan role.
 */
export const Can = ({ children, role }: CanProps) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) return null;

  // Jika tidak ada role yang ditentukan, tampilkan untuk semua orang yang terautentikasi
  if (!role) return <>{children}</>;

  const allowedRoles = Array.isArray(role) ? role : [role];

  if (allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }

  return null;
};
