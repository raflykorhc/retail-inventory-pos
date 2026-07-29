import express from "express";
import { getPayables, createPayment, bulkPayment, createPayable, getPayablePayments, updatePayableAmount, deletePayable } from "../controllers/payable.controller.ts";

const router = express.Router();

router.get("/", getPayables);
router.get("/payments", getPayablePayments);
router.post("/", createPayable);
router.post("/bulk-payment", bulkPayment);
router.post("/:id/payments", createPayment);
router.put("/:id/amount", updatePayableAmount);
router.delete("/:id", deletePayable);

export default router;
