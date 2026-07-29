import express from "express";
import { UnitController } from "../controllers/UnitController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();

router.get("/", asyncHandler(UnitController.getAll));
router.post("/", asyncHandler(UnitController.create));
router.put("/:id", asyncHandler(UnitController.update));
router.delete("/:id", asyncHandler(UnitController.delete));

export default router;
