import type { Request, Response } from "express";
import { CategoryService } from "../services/CategoryService.ts";

export class CategoryController {
  static async getAll(req: Request, res: Response) {
    const categories = await CategoryService.getAll();
    res.json(categories);
  }

  static async create(req: any, res: Response) {
    const { name } = req.body;
    const category = await CategoryService.create(name, req.user?.id);
    res.json(category);
  }

  static async update(req: any, res: Response) {
    const { id } = req.params;
    const { name } = req.body;
    const category = await CategoryService.update(id, name, req.user?.id);
    res.json(category);
  }

  static async delete(req: any, res: Response) {
    const { id } = req.params;
    const result = await CategoryService.delete(id, req.user?.id);
    res.json(result);
  }
}
