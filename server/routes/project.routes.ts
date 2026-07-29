import express from "express";
import { ProjectController } from "../controllers/ProjectController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();

router.get("/", asyncHandler(ProjectController.getAll));
router.post("/", asyncHandler(ProjectController.create));
router.put("/:id", asyncHandler(ProjectController.update));
router.delete("/:id", asyncHandler(ProjectController.delete));

router.get("/:id/report", asyncHandler(ProjectController.getReport));

export default router;
