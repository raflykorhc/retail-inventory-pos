import type { Request, Response } from "express";
import { InventoryOptimizationService } from "../services/InventoryOptimizationService.ts";
import { SchedulerService } from "../services/SchedulerService.ts";

export class InventoryOptimizationController {
  /**
   * GET /api/inventory-optimization/preview
   * Mengembalikan kalkulasi ABC + Min-Max untuk semua produk aktif.
   * Hanya kalkulasi, tidak menyimpan ke database.
   * Mendukung query parameters dinamis untuk penyesuaian parameter optimasi.
   */
  static async preview(req: Request, res: Response) {
    try {
      // Baca query parameters dengan nilai fallback default yang aman
      const monthsRange = parseInt(req.query.monthsRange as string) || 3;
      const limitA = parseInt(req.query.limitA as string) || 80;
      const limitB = parseInt(req.query.limitB as string) || 95;
      const holdingInterval = parseInt(req.query.holdingInterval as string) || 14;

      const results = await InventoryOptimizationService.calculateOptimization(
        monthsRange,
        limitA,
        limitB,
        holdingInterval
      );

      res.json({ success: true, data: results, total: results.length });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Gagal menghitung kalkulasi." });
    }
  }

  /**
   * POST /api/inventory-optimization/apply
   * Menerapkan rekomendasi ke database untuk produk yang dipilih admin.
   * Solusi 6: Menerima array optimizations langsung untuk update cepat.
   *
   * Body: {
   *   optimizations: Array<{
   *     productId: string,
   *     newAbcCategory: "A" | "B" | "C",
   *     suggestedMin: number,
   *     suggestedMax: number
   *   }>,
   *   applyMinStock?: boolean      // true = update minStock aktif juga
   * }
   */
  static async apply(req: any, res: Response) {
    try {
      const { optimizations, applyMinStock = true } = req.body;
      const userId = req.user?.id;

      if (!optimizations || !Array.isArray(optimizations) || optimizations.length === 0) {
        res.status(400).json({ success: false, message: "optimizations tidak boleh kosong dan harus berupa array." });
        return;
      }

      const result = await InventoryOptimizationService.applyOptimization(
        optimizations,
        Boolean(applyMinStock),
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
}
