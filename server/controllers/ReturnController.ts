import type { Request, Response } from "express";
import { ReturnService } from "../services/ReturnService.ts";

export class ReturnController {
  static async getAll(req: Request, res: Response) {
    const returns = await ReturnService.getAll();
    res.json(returns);
  }

  static async create(req: any, res: Response) {
    const retur = await ReturnService.create(req.body, req.user?.id);
    res.json(retur);
  }
}
