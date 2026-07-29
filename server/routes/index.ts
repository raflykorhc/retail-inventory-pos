import express from "express";
import categoryRoutes from "./category.routes.ts";
import unitRoutes from "./unit.routes.ts";
import productRoutes from "./product.routes.ts";
import printRoutes from "./print.routes.ts";
import salesRoutes from "./sales.routes.ts";
import dashboardRoutes from "./dashboard.routes.ts";
import cartRoutes from "./cart.routes.ts";
import reportsRoutes from "./reports.routes.ts";
import authRoutes from "./auth.routes.ts";
import supplierRoutes from "./supplier.routes.ts";
import purchaseRoutes from "./purchase.routes.ts";
import inventoryOptimizationRoutes from "./inventory-optimization.routes.ts";
import settingsRoutes from "./settings.routes.ts";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/units", unitRoutes);
router.use("/products", productRoutes);
router.use("/print", printRoutes);
router.use("/sales", salesRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/cart", cartRoutes);
router.use("/reports", reportsRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/inventory-optimization", inventoryOptimizationRoutes);
router.use("/settings", settingsRoutes);

export default router;
