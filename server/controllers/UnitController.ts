import type { Request, Response } from "express";
import { UnitService } from "../services/UnitService.ts";

export class UnitController {
  static async getAll(req: Request, res: Response) {
    const units = await UnitService.getAll();
    res.json(units);
  }

  static async create(req: any, res: Response) {
    const { name } = req.body;
    const unit = await UnitService.create(name, req.user?.id);
    res.json(unit);
  }

  static async update(req: any, res: Response) {
    const { id } = req.params;
    const { name } = req.body;
    const unit = await UnitService.update(id, name, req.user?.id);
    res.json(unit);
  }

  static async delete(req: any, res: Response) {
    const { id } = req.params;
    const result = await UnitService.delete(id, req.user?.id);
    res.json(result);
  }
}
