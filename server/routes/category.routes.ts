import express from "express";
import { CategoryController } from "../controllers/CategoryController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();

router.get("/", asyncHandler(CategoryController.getAll));
router.post("/", asyncHandler(CategoryController.create));
router.put("/:id", asyncHandler(CategoryController.update));
router.delete("/:id", asyncHandler(CategoryController.delete));

export default router;
