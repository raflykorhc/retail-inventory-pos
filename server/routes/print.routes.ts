import express from "express";
import { PrintController } from "../controllers/PrintController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();

router.post("/", asyncHandler(PrintController.thermalPrint));

export default router;
