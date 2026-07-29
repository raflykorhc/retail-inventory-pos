import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.ts";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  console.error("Unhandled Error:", err);
  
  if (err.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as any;
    return res.status(400).json({
      error: `Database Error (${prismaErr.code}): ${prismaErr.message}`,
      code: prismaErr.code
    });
  }

  return res.status(500).json({
    error: "Terjadi kesalahan pada server",
  });
};
