import type { Request, Response } from "express";
import { CustomerService } from "../services/CustomerService.ts";

export class CustomerController {
  static async getAll(req: Request, res: Response) {
    const customers = await CustomerService.getAll();
    res.json(customers);
  }

  static async create(req: any, res: Response) {
    const customer = await CustomerService.create(req.body, req.user?.id);
    res.json(customer);
  }

  static async update(req: any, res: Response) {
    const { id } = req.params;
    const customer = await CustomerService.update(id, req.body, req.user?.id);
    res.json(customer);
  }

  static async delete(req: any, res: Response) {
    const { id } = req.params;
    const result = await CustomerService.delete(id, req.user?.id);
    res.json(result);
  }



  static async import(req: Request, res: Response) {
    const { customers } = req.body;
    const result = await CustomerService.import(customers);
    res.json({ success: true, count: result.length });
  }

  static async getHistory(req: Request, res: Response) {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const history = await CustomerService.getHistory(id, page, limit);
    res.json(history);
  }
}
