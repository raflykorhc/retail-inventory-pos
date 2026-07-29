import express from "express";
import { SalesController } from "../controllers/SalesController.ts";
import { ExpenseController } from "../controllers/ExpenseController.ts";
import { getPurchaseSummary } from "../controllers/purchase.controller.ts";
import { StockReportController } from "../controllers/StockReportController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();

// Laporan Penjualan
router.get("/sales", asyncHandler(SalesController.getAll));
router.get("/sales/summary", asyncHandler(SalesController.getSummary));

// Laporan Pengeluaran
router.get("/expenses/summary", asyncHandler(ExpenseController.getSummary));

// Laporan Pembelian
router.get("/purchases/summary", asyncHandler(getPurchaseSummary));

// Laporan Mutasi Stok
router.get("/stock/movements", StockReportController.getMovements);
router.get("/stock/summary", StockReportController.getSummary);

export default router;
