import { Request, Response } from "express";
import { StockReportService } from "../services/StockReportService.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export class StockReportController {
  static getMovements = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      categoryId: req.query.categoryId as string,
      type: req.query.type as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await StockReportService.getMovements(filters);
    res.json(result);
  });

  static getSummary = asyncHandler(async (req: any, res: Response) => {
    const summary = await StockReportService.getSummary();
    if (req.user?.role === "CASHIER") {
      summary.totalAssetValue = 0;
      summary.reorderTotalCost = 0;
      summary.valuationBySupplier = [];
    }
    res.json(summary);
  });
}
