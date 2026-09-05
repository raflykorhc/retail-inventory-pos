import type { Request, Response } from "express";
import { SalesService } from "../services/SalesService.ts";

export class SalesController {
  static async getAll(req: Request, res: Response) {
    const filters = {
      paymentStatus: req.query.paymentStatus as string,
      paymentMethod: req.query.paymentMethod as string,
      categoryId: req.query.categoryId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      search: req.query.search as string,
    };
    const result = await SalesService.getAll(filters);
    res.json(result);
  }

  static async getSummary(req: Request, res: Response) {
    const filters = {
      paymentStatus: req.query.paymentStatus as string,
      paymentMethod: req.query.paymentMethod as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      categoryId: req.query.categoryId as string,
    };
    const result = await SalesService.getSummary(filters);
    res.json(result);
  }

  static async create(req: any, res: Response) {
    const sale = await SalesService.create({
      ...req.body,
      userId: req.user?.id
    });
    res.json(sale);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const result = await SalesService.getById(id);
    res.json(result);
  }

  static async delete(req: any, res: Response) {
    const { id } = req.params;
    const result = await SalesService.delete(id, req.user?.id);
    res.json(result);
  }
}
