import { Router } from "express";
import { ExpenseCategoryController } from "../controllers/ExpenseCategoryController.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = Router();

router.use(authMiddleware);

router.get("/", asyncHandler(ExpenseCategoryController.getAll));
router.post("/", asyncHandler(ExpenseCategoryController.create));
router.put("/:id", asyncHandler(ExpenseCategoryController.update));
router.delete("/:id", asyncHandler(ExpenseCategoryController.delete));

export default router;
