import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware.ts";
import { ApiError } from "../utils/ApiError.ts";

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "Akses ditolak. Anda tidak memiliki izin."));
    }

    next();
  };
};
