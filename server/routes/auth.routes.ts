import express from "express";
import { AuthController } from "../controllers/AuthController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { validateResource } from "../middleware/validateResource.ts";
import { registerSchema, loginSchema } from "../schemas/auth.schema.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";

import { roleMiddleware } from "../middleware/role.middleware.ts";

const router = express.Router();

router.post(
  "/register", 
  authMiddleware,
  roleMiddleware(["OWNER", "ADMIN", "MANAGER"]),
  validateResource(registerSchema), 
  asyncHandler(AuthController.register)
);

router.post(
  "/login", 
  validateResource(loginSchema), 
  asyncHandler(AuthController.login)
);

router.get("/me", authMiddleware, asyncHandler(AuthController.me));

router.get(
  "/users", 
  authMiddleware, 
  roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), 
  asyncHandler(AuthController.listUsers)
);

router.put(
  "/users/:id", 
  authMiddleware, 
  roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), 
  asyncHandler(AuthController.update)
);

router.delete(
  "/users/:id", 
  authMiddleware, 
  roleMiddleware(["OWNER", "ADMIN", "MANAGER"]), 
  asyncHandler(AuthController.delete)
);

export default router;
