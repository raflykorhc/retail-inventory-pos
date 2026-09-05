import type { Request, Response } from "express";
import { InventoryOptimizationService } from "../services/InventoryOptimizationService.ts";
import { SchedulerService } from "../services/SchedulerService.ts";

export class InventoryOptimizationController {
  /**
   * GET /api/inventory-optimization/preview
   * Mengembalikan kalkulasi 4 Langkah ABC + Min-Max Dinamis untuk semua produk aktif.
   * Hanya kalkulasi, tidak menyimpan ke database.
   * Mendukung query parameters rentang tanggal (startDate, endDate) atau bulan (monthsRange).
   */
  static async preview(req: Request, res: Response) {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const monthsRange = req.query.monthsRange ? parseInt(req.query.monthsRange as string) : 3;
      const limitA = req.query.limitA ? parseInt(req.query.limitA as string) : undefined;
      const limitB = req.query.limitB ? parseInt(req.query.limitB as string) : undefined;
      const holdingInterval = req.query.holdingInterval ? parseInt(req.query.holdingInterval as string) : undefined;

      const results = await InventoryOptimizationService.calculateOptimization({
        startDate,
        endDate,
        monthsRange,
        limitA,
        limitB,
        holdingInterval,
      });

      res.json({ success: true, data: results, total: results.length });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Gagal menghitung kalkulasi." });
    }
  }

  static async previewStream(req: Request, res: Response) {
    console.log("previewStream called");
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const monthsRange = req.query.monthsRange ? parseInt(req.query.monthsRange as string) : 3;
      const limitA = req.query.limitA ? parseInt(req.query.limitA as string) : undefined;
      const limitB = req.query.limitB ? parseInt(req.query.limitB as string) : undefined;
      const holdingInterval = req.query.holdingInterval ? parseInt(req.query.holdingInterval as string) : undefined;

      const results = await InventoryOptimizationService.calculateOptimization({
        startDate,
        endDate,
        monthsRange,
        limitA,
        limitB,
        holdingInterval,
        onProgress: (step: number, subtaskIndex: number) => {
          res.write(`data: ${JSON.stringify({ step, subtaskIndex })}\n\n`);
        }
      });

      console.log("previewStream success", results.length);
      res.write(`data: ${JSON.stringify({ success: true, total: results.length, data: results })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("previewStream error:", error);
      res.write(`data: ${JSON.stringify({ success: false, message: error.message || "Gagal menghitung kalkulasi." })}\n\n`);
      res.end();
    }
  }

  /**
   * POST /api/inventory-optimization/apply
   * Menerapkan rekomendasi (Langkah 4: Pembaruan Klasifikasi) ke database untuk produk yang dipilih operator.
   *
   * Body: {
   *   optimizations: Array<{
   *     productId: string,
   *     newAbcCategory: "A" | "B" | "C",
   *     suggestedMin: number,
   *     suggestedMax: number
   *   }>,
   *   applyMinStock?: boolean,      // true = update minStock aktif juga
   *   applyMaxStock?: boolean       // true = update maxStock aktif juga
   * }
   */
  static async apply(req: any, res: Response) {
    try {
      const { optimizations, applyMinStock = true, applyMaxStock = true } = req.body;
      const userId = req.user?.id;

      if (!optimizations || !Array.isArray(optimizations) || optimizations.length === 0) {
        res.status(400).json({ success: false, message: "optimizations tidak boleh kosong dan harus berupa array." });
        return;
      }

      const result = await InventoryOptimizationService.applyOptimization(
        optimizations,
        Boolean(applyMinStock),
        Boolean(applyMaxStock),
        userId
      );

      // Catat waktu eksekusi pembaruan manual ke status cache
      SchedulerService.updateStatus("manual");

      res.json({
        success: true,
        message: `${result.updatedCount} produk berhasil diperbarui.`,
        updatedCount: result.updatedCount,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Gagal menerapkan rekomendasi." });
    }
  }

  /**
   * GET /api/inventory-optimization/last-state
   * Mengembalikan hasil kalkulasi analitik terakhir yang tersimpan di cache atau database.
   * Cepat dan tidak menjalankan kueri agregasi berat dari awal.
   */
  static async getLastState(req: Request, res: Response) {
    try {
      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const searchQuery = req.query.search as string | undefined;
      const filterCategory = req.query.filterCategory as string | undefined;
      const changedOnly = req.query.changedOnly === 'true';

      const result = await InventoryOptimizationService.getLastOrStoredState({
        cursor,
        limit,
        searchQuery,
        filterCategory,
        changedOnly,
      });
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Gagal mengambil status klasifikasi terakhir." });
    }
  }

  /**
   * GET /api/inventory-optimization/status
   * Mengambil status waktu pembaruan otomatis (lastAutoRun) dan manual (lastManualRun) terakhir.
   */
  static async status(req: Request, res: Response) {
    try {
      const status = SchedulerService.getStatus();
      res.json({ success: true, ...status });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Gagal mengambil status penjadwal." });
    }
  }

  /**
   * POST /api/inventory-optimization/reset
   * Mereset status penerapan reklasifikasi ABC & Stok Min-Max ke kondisi semula (unclassified / null).
   * Body: { productIds?: string[], resetMinMax?: boolean }
   */
  static async reset(req: any, res: Response) {
    try {
      const { productIds, resetMinMax = true } = req.body || {};
      const userId = req.user?.id;

      const result = await InventoryOptimizationService.resetOptimization(
        productIds,
        Boolean(resetMinMax),
        userId
      );

      res.json({
        success: true,
        message: `${result.resetCount} produk berhasil di-reset ke kondisi awal.`,
        resetCount: result.resetCount,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Gagal mereset hasil penerapan." });
    }
  }
}
