import express from "express";
import { SettingsController } from "../controllers/SettingsController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();

router.get("/", asyncHandler(SettingsController.getSettings));
router.post("/", asyncHandler(SettingsController.saveSettings));

export default router;
