import express from "express";
import { CartController } from "../controllers/CartController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();

router.get("/:sessionId", asyncHandler(CartController.getCart));
router.post("/", asyncHandler(CartController.syncCart));

export default router;
