import express from "express";
import { DeliveryController } from "../controllers/DeliveryController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();

router.get("/", asyncHandler(DeliveryController.getAll));
router.post("/", asyncHandler(DeliveryController.create));
router.post("/bulk-trip", asyncHandler(DeliveryController.bulkTrip));
router.put("/:id", asyncHandler(DeliveryController.update));
router.delete("/:id", asyncHandler(DeliveryController.delete));

export default router;
