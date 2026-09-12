import { ReactNode } from "react";
import { useAuthStore, Role, isOwnerRole, isCashierRole } from "../../store/useAuthStore";

interface CanProps {
  children: ReactNode;
  role?: Role | Role[] | string | string[];
}

/**
 * Komponen RBAC untuk menyembunyikan/menampilkan elemen berdasarkan peran (Pemilik Usaha / Kasir).
 */
export const Can = ({ children, role }: CanProps) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) return null;

  // Jika tidak ada role yang ditentukan, tampilkan untuk semua pengguna terautentikasi
  if (!role) return <>{children}</>;

  const allowedRoles = Array.isArray(role) ? role : [role];
  const userRole = user.role;

  const isOwner = isOwnerRole(userRole);
  const isCashier = isCashierRole(userRole);

  const allowsOwner = allowedRoles.some((r) => r === "OWNER" || r === "ADMIN" || r === "MANAGER");
  const allowsCashier = allowedRoles.some((r) => r === "CASHIER");

  const hasAccess = (isOwner && allowsOwner) || (isCashier && allowsCashier) || allowedRoles.includes(userRole);

  if (hasAccess) {
    return <>{children}</>;
  }

  return null;
};
