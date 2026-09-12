import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware.ts";
import { ApiError } from "../utils/ApiError.ts";

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized"));
    }

    const userRole = req.user.role;
    // Normalisasi: OWNER, ADMIN, dan MANAGER mewakili Pemilik Usaha
    const isOwnerLevel = userRole === "OWNER" || userRole === "ADMIN" || userRole === "MANAGER";
    const allowsOwner = allowedRoles.includes("OWNER") || allowedRoles.includes("ADMIN") || allowedRoles.includes("MANAGER");

    const hasPermission = allowedRoles.includes(userRole) || (isOwnerLevel && allowsOwner);

    if (!hasPermission) {
      return next(new ApiError(403, "Akses ditolak. Fitur ini hanya dapat diakses oleh Pemilik Usaha."));
    }

    next();
  };
};
