import express from "express";
import { getPurchases, createPurchase } from "../controllers/purchase.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { roleMiddleware } from "../middleware/role.middleware.ts";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(["OWNER", "ADMIN", "MANAGER"]));

router.get("/", getPurchases);
router.post("/", createPurchase);

export default router;
