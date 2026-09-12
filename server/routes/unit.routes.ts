import express from "express";
import { UnitController } from "../controllers/UnitController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { roleMiddleware } from "../middleware/role.middleware.ts";

const router = express.Router();

router.get("/", asyncHandler(UnitController.getAll));
router.post("/", authMiddleware, roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(UnitController.create));
router.put("/:id", authMiddleware, roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(UnitController.update));
router.delete("/:id", authMiddleware, roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), asyncHandler(UnitController.delete));

export default router;
