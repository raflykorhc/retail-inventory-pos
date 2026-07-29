import express from "express";
import { CustomerController } from "../controllers/CustomerController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();

router.get("/", asyncHandler(CustomerController.getAll));
router.post("/", asyncHandler(CustomerController.create));
router.put("/:id", asyncHandler(CustomerController.update));
router.delete("/:id", asyncHandler(CustomerController.delete));

router.post("/import", asyncHandler(CustomerController.import));
router.get("/:id/history", asyncHandler(CustomerController.getHistory));


export default router;
