import type { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

export const validateResource = (schema: z.ZodTypeAny) => 
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (e: any) {
      if (e instanceof ZodError) {
        return res.status(400).json({
          error: "Validasi Gagal",
          details: e.issues.map(err => ({
            path: err.path.join("."),
            message: err.message
          }))
        });
      }
      return res.status(400).json({ error: e.message });
    }
  };
