import express from "express";
import { SalesController } from "../controllers/SalesController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";

const router = express.Router();

router.use(authMiddleware);

router.get("/", asyncHandler(SalesController.getAll));
router.post("/", asyncHandler(SalesController.create));
router.post("/:id/fulfill", asyncHandler(SalesController.fulfillPendingItems));
router.delete("/:id", asyncHandler(SalesController.softDelete));

export default router;
