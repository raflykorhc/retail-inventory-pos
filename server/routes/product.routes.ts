import express from "express";
import { ProductController } from "../controllers/ProductController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { roleMiddleware } from "../middleware/role.middleware.ts";

import { ProductImageController } from "../controllers/ProductImageController.ts";

const router = express.Router();

// Public route for loading images efficiently
router.get("/:id/image", asyncHandler(ProductImageController.getImage));

router.use(authMiddleware);

router.get("/", asyncHandler(ProductController.getAll));
router.post("/", roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(ProductController.create));
router.put("/:id", roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(ProductController.update));
router.post("/:id/preflight-scale-shift", roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(ProductController.preflightScaleShift));
router.post("/bulk-delete", roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(ProductController.bulkDelete));
router.delete("/:id", roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(ProductController.delete));

router.post("/:id/stock", roleMiddleware(["OWNER", "ADMIN", "MANAGER", "CASHIER"]), asyncHandler(ProductController.addStock));
router.get("/:id/logs", asyncHandler(ProductController.getLogs));
router.get("/:id/batches", asyncHandler(ProductController.getBatches));
router.get("/batches/:id", asyncHandler(ProductController.getBatchById));
router.put("/batches/:id", roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(ProductController.updateBatch));
router.post("/cleanup-batches", roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(ProductController.cleanupBatches));

export default router;

