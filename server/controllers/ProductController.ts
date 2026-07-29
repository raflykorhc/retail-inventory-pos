import type { Request, Response } from "express";
import { ProductService } from "../services/ProductService.ts";

export class ProductController {
  static async getAll(req: Request, res: Response) {
    const { page, limit, search, categoryId, supplierId, sort } = req.query;
    const products = await ProductService.getAll(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      search ? String(search) : undefined,
      categoryId ? String(categoryId) : undefined,
      supplierId ? String(supplierId) : undefined,
      sort ? String(sort) : undefined
    );
    res.json(products);
  }

  static async bulkDelete(req: any, res: Response) {
    const { ids } = req.body;
    const userId = req.user?.id;
    const result = await ProductService.bulkDelete(ids, userId);
    res.json(result);
  }

  static async create(req: any, res: Response) {
    const userId = req.user?.id;
    const product = await ProductService.create(req.body, userId);
    res.json(product);
  }

  static async update(req: any, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;
    const product = await ProductService.update(id, req.body, userId);
    res.json(product);
  }

  static async delete(req: any, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;
    const result = await ProductService.delete(id, userId);
    res.json(result);
  }

  static async addStock(req: any, res: Response) {
    const { id } = req.params;
    const { quantity, cost, unitId, conversionFactor } = req.body;
    const userId = req.user?.id;
    const result = await ProductService.addStock(
      id, 
      Number(quantity), 
      cost ? Number(cost) : undefined,
      unitId ? String(unitId) : undefined,
      conversionFactor ? Number(conversionFactor) : undefined,
      userId
    );
    res.json({ success: true, product: result });
  }

  static async getLogs(req: Request, res: Response) {
    const { id } = req.params;
    const { page, limit } = req.query;
    const logs = await ProductService.getLogs(
      id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    res.json(logs);
  }

  static async getBatches(req: Request, res: Response) {
    const { id } = req.params;
    const { activeOnly } = req.query;
    // Handle both string "true" and actual boolean true if passed through middleware
    const isActiveOnly = activeOnly === "true" || (activeOnly as unknown) === true;
    const batches = await ProductService.getBatches(id, isActiveOnly);
    res.json(batches);
  }

  static async getBatchById(req: Request, res: Response) {
    const { id } = req.params;
    const batch = await ProductService.getBatchById(id);
    res.json(batch);
  }

  static async updateBatch(req: any, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;
    const result = await ProductService.updateBatch(id, req.body, userId);
    res.json(result);
  }

  static async cleanupBatches(req: Request, res: Response) {
    const { days } = req.query;
    const count = await ProductService.archiveOldEmptyBatches(days ? Number(days) : 30);
    res.json({ success: true, archivedCount: count });
  }
}

