import express from "express";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from "../controllers/supplier.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { roleMiddleware } from "../middleware/role.middleware.ts";

const router = express.Router();

router.get("/", getSuppliers);
router.post("/", authMiddleware, roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), createSupplier);
router.put("/:id", authMiddleware, roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), updateSupplier);
router.delete("/:id", authMiddleware, roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), deleteSupplier);

export default router;
