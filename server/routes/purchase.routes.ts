import express from "express";
import { getPurchases, createPurchase } from "../controllers/purchase.controller.ts";

const router = express.Router();

router.get("/", getPurchases);
router.post("/", createPurchase);

export default router;
