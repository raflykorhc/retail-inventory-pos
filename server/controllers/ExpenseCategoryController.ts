import type { Request, Response } from "express";
import { ExpenseCategoryService } from "../services/ExpenseCategoryService.ts";

export class ExpenseCategoryController {
  static async getAll(req: Request, res: Response) {
    const result = await ExpenseCategoryService.getAll();
    res.json(result);
  }

  static async create(req: Request, res: Response) {
    const category = await ExpenseCategoryService.create(req.body);
    res.json(category);
  }
  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const category = await ExpenseCategoryService.update(id, req.body);
    res.json(category);
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;
    const result = await ExpenseCategoryService.delete(id);
    res.json(result);
  }
}
