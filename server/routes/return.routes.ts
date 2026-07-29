import express from "express";
import { ReturnController } from "../controllers/ReturnController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();

router.get("/", asyncHandler(ReturnController.getAll));
router.post("/", asyncHandler(ReturnController.create));

export default router;
