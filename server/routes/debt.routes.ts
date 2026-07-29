import express from "express";
import { DebtController } from "../controllers/DebtController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();

router.get("/", asyncHandler(DebtController.getAll));
router.get("/payments", asyncHandler(DebtController.getPayments));
router.post("/", asyncHandler(DebtController.create));
router.post("/bulk-payment", asyncHandler(DebtController.bulkPayment));
router.post("/:id/payments", asyncHandler(DebtController.addPayment));
router.post("/:id/remind", asyncHandler(DebtController.sendReminder));
router.put("/:id/amount", asyncHandler(DebtController.updateAmount));
router.delete("/:id", asyncHandler(DebtController.delete));

export default router;
