import express from "express";
import { InventoryOptimizationController } from "../controllers/InventoryOptimizationController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { roleMiddleware } from "../middleware/role.middleware.ts";

const router = express.Router();

router.use(authMiddleware);

// Preview kalkulasi ABC + Min-Max (hanya kalkulasi, tidak menyimpan)
router.get(
  "/preview",
  roleMiddleware(["OWNER", "ADMIN", "MANAGER"]),
  asyncHandler(InventoryOptimizationController.preview)
);

// Lakukan kalkulasi dengan progress stream
router.get(
  "/preview-stream",
  roleMiddleware(["OWNER", "ADMIN", "MANAGER"]),
  asyncHandler(InventoryOptimizationController.previewStream)
);

// Terapkan rekomendasi yang disetujui admin ke database
router.post(
  "/apply",
  roleMiddleware(["OWNER", "ADMIN", "MANAGER"]),
  asyncHandler(InventoryOptimizationController.apply)
);

// Ambil hasil kalkulasi terakhir (cache / database)
router.get(
  "/last-state",
  roleMiddleware(["OWNER", "ADMIN", "MANAGER"]),
  asyncHandler(InventoryOptimizationController.getLastState)
);

// Ambil status pembaruan otomatis & manual terakhir
router.get(
  "/status",
  roleMiddleware(["OWNER", "ADMIN", "MANAGER"]),
  asyncHandler(InventoryOptimizationController.status)
);

// Reset hasil penerapan klasifikasi ABC & Min-Max
router.post(
  "/reset",
  roleMiddleware(["OWNER", "ADMIN", "MANAGER"]),
  asyncHandler(InventoryOptimizationController.reset)
);

export default router;
