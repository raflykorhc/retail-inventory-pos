import express from "express";
import { SettingsController } from "../controllers/SettingsController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { roleMiddleware } from "../middleware/role.middleware.ts";

const router = express.Router();

router.get("/", asyncHandler(SettingsController.getSettings));
router.post("/", authMiddleware, roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(SettingsController.saveSettings));

export default router;
