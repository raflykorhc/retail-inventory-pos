import type { Request, Response } from "express";
import { DeliveryService } from "../services/DeliveryService.ts";

export class DeliveryController {
  static async getAll(req: Request, res: Response) {
    const deliveries = await DeliveryService.getAll();
    res.json(deliveries);
  }

  static async create(req: any, res: Response) {
    const delivery = await DeliveryService.createFromSale(req.body, req.user?.id);
    res.json(delivery);
  }

  static async update(req: any, res: Response) {
    const { id } = req.params;
    const updatedDelivery = await DeliveryService.update(id, req.body, req.user?.id);
    res.json(updatedDelivery);
  }

  static async bulkTrip(req: any, res: Response) {
    const result = await DeliveryService.bulkTrip(req.body, req.user?.id);
    res.json(result);
  }

  static async delete(req: any, res: Response) {
    const { id } = req.params;
    const result = await DeliveryService.delete(id, req.user?.id);
    res.json(result);
  }
}
