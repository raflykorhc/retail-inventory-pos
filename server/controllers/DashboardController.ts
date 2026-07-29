import type { Request, Response } from "express";
import { DashboardService } from "../services/DashboardService.ts";

export class DashboardController {
  static async getStats(req: Request, res: Response) {
    const { startDate, endDate } = req.query;
    const stats = await DashboardService.getStats(
      startDate as string, 
      endDate as string
    );
    res.json(stats);
  }
}
