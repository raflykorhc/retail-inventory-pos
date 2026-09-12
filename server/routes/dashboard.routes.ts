import express from "express";
import { DashboardController } from "../controllers/DashboardController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { roleMiddleware } from "../middleware/role.middleware.ts";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(["OWNER", "ADMIN", "MANAGER"]));

router.get("/stats", asyncHandler(DashboardController.getStats));

export default router;
