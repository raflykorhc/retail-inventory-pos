import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore, isOwnerRole, isCashierRole } from "../store/useAuthStore";
import { toast } from "@/components/ui/toast";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to={`/login${location.search}`} state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role;
    const isOwner = isOwnerRole(userRole);
    const isCashier = isCashierRole(userRole);

    const allowsOwner = allowedRoles.some((r) => r === "OWNER" || r === "ADMIN" || r === "MANAGER");
    const allowsCashier = allowedRoles.some((r) => r === "CASHIER");

    const hasAccess = (isOwner && allowsOwner) || (isCashier && allowsCashier) || allowedRoles.includes(userRole);

    if (!hasAccess) {
      // Tampilkan notifikasi penolakan akses
      toast.error("Akses Ditolak", {
        description: "Halaman ini hanya dapat diakses oleh Pemilik Usaha.",
      });

      // Arahkan ke rute default masing-masing peran
      if (isCashier) {
        return <Navigate to="/" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
