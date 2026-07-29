import type { Request, Response } from "express";
import { DebtService } from "../services/DebtService.ts";

export class DebtController {
  static async create(req: Request, res: Response) {
    const result = await DebtService.create(req.body);
    res.status(201).json(result);
  }

  static async getAll(req: Request, res: Response) {
    const { page, limit, search } = req.query;
    const debts = await DebtService.getAll(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      search as string
    );
    res.json(debts);
  }

  static async addPayment(req: Request, res: Response) {
    const { id } = req.params;
    const result = await DebtService.addPayment(id, req.body);
    res.json(result);
  }

  static async bulkPayment(req: Request, res: Response) {
    const { customerId, amount, paymentMethod, attachment } = req.body;
    const result = await DebtService.bulkPayment(customerId, amount, paymentMethod, attachment);
    res.json(result);
  }

  static async sendReminder(req: Request, res: Response) {
    const { id } = req.params;
    const { notes, method } = req.body;
    const result = await DebtService.sendReminder(id, { notes, method });
    res.json(result);
  }

  static async getPayments(req: Request, res: Response) {
    const { page, limit, search, startDate, endDate, method } = req.query;
    const result = await DebtService.getPayments({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
      method: method as string
    });
    res.json(result);
  }

  static async updateAmount(req: Request, res: Response) {
    const { id } = req.params;
    const { amountDue } = req.body;
    const result = await DebtService.updateAmount(id, Number(amountDue));
    res.json(result);
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;
    const result = await DebtService.delete(id);
    res.json(result);
  }
}
