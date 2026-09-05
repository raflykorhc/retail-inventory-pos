import express from "express";
import { SalesController } from "../controllers/SalesController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";

const router = express.Router();

router.use(authMiddleware);

router.get("/", asyncHandler(SalesController.getAll));
router.get("/summary", asyncHandler(SalesController.getSummary));
router.get("/:id", asyncHandler(SalesController.getById));
router.post("/", asyncHandler(SalesController.create));
router.delete("/:id", asyncHandler(SalesController.delete));

export default router;
