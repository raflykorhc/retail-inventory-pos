import type { Request, Response } from "express";
import { ExpenseService } from "../services/ExpenseService.ts";

export class ExpenseController {
  static async getAll(req: Request, res: Response) {
    const { startDate, endDate, page, limit, search, categoryId } = req.query;
    const result = await ExpenseService.getAll(
      startDate as string,
      endDate as string,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      search as string,
      categoryId as string
    );
    res.json(result);
  }

  static async getSummary(req: Request, res: Response) {
    const { startDate, endDate, search, categoryId } = req.query;
    const result = await ExpenseService.getSummary(startDate as string, endDate as string, search as string, categoryId as string);
    res.json(result);
  }

  static async create(req: Request, res: Response) {
    const expense = await ExpenseService.create(req.body);
    res.json(expense);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const expense = await ExpenseService.update(id, req.body);
    res.json(expense);
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;
    const result = await ExpenseService.delete(id);
    res.json(result);
  }
}
