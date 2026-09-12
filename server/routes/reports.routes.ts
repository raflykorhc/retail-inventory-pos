import express from "express";
import { SalesController } from "../controllers/SalesController.ts";
import { getPurchaseSummary } from "../controllers/purchase.controller.ts";
import { StockReportController } from "../controllers/StockReportController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { roleMiddleware } from "../middleware/role.middleware.ts";

const router = express.Router();

router.use(authMiddleware);

// Laporan Penjualan (Riwayat transaksi dapat diakses Kasir & Pemilik)
router.get("/sales", asyncHandler(SalesController.getAll));
// Ringkasan Keuangan (Omset & Laba) mutlak hanya untuk Pemilik Usaha
router.get("/sales/summary", roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(SalesController.getSummary));
router.get("/sales/:id", asyncHandler(SalesController.getById));

// Laporan Pembelian (HPP & Biaya Pengadaan) khusus Pemilik Usaha
router.get("/purchases/summary", roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(getPurchaseSummary));

// Laporan Mutasi Stok
router.get("/stock/movements", StockReportController.getMovements);
router.get("/stock/summary", StockReportController.getSummary);

export default router;
