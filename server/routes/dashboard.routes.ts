import express from "express";
import { DashboardController } from "../controllers/DashboardController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();

router.get("/stats", asyncHandler(DashboardController.getStats));

export default router;
