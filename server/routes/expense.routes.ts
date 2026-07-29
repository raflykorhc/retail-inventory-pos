import express from "express";
import { ExpenseController } from "../controllers/ExpenseController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();

router.get("/summary", asyncHandler(ExpenseController.getSummary));
router.get("/", asyncHandler(ExpenseController.getAll));
router.post("/", asyncHandler(ExpenseController.create));
router.put("/:id", asyncHandler(ExpenseController.update));
router.delete("/:id", asyncHandler(ExpenseController.delete));

export default router;
