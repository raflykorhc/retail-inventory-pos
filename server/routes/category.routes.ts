import express from "express";
import { CategoryController } from "../controllers/CategoryController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { roleMiddleware } from "../middleware/role.middleware.ts";

const router = express.Router();

router.get("/", asyncHandler(CategoryController.getAll));
router.post("/", authMiddleware, roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(CategoryController.create));
router.put("/:id", authMiddleware, roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(CategoryController.update));
router.delete("/:id", authMiddleware, roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(CategoryController.delete));

export default router;
