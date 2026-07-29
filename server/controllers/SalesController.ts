import type { Request, Response } from "express";
import { SalesService } from "../services/SalesService.ts";

export class SalesController {
  static async getAll(req: Request, res: Response) {
    const filters = {
      customerId: req.query.customerId as string,
      projectId: req.query.projectId as string,
      paymentStatus: req.query.paymentStatus as string,
      paymentMethod: req.query.paymentMethod as string,
      categoryId: req.query.categoryId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      hasPending: req.query.hasPending as string,
      isDeliveryRequired: req.query.isDeliveryRequired as string,
      search: req.query.search as string,
    };
    const result = await SalesService.getReport(filters);
    res.json(result);
  }

  static async getSummary(req: Request, res: Response) {
    const filters = {
      customerId: req.query.customerId as string,
      projectId: req.query.projectId as string,
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

  static async fulfillPendingItems(req: any, res: Response) {
    const { id } = req.params;
    const { itemsToTake } = req.body;
    const result = await SalesService.fulfillPendingItems(id, itemsToTake, req.user?.id);
    res.json(result);
  }

  static async softDelete(req: any, res: Response) {
    const { id } = req.params;
    const result = await SalesService.softDelete(id, req.user?.id);
    res.json(result);
  }
}
