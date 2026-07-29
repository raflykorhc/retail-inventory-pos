import { roleMiddleware } from "./role.middleware";
import { AuthRequest } from "./auth.middleware";
import { Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

describe("roleMiddleware", () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should allow access if user role is in allowedRoles", () => {
    req.user = { id: "u1", username: "admin", role: "ADMIN" };
    const middleware = roleMiddleware(["ADMIN", "OWNER"]);

    middleware(req as AuthRequest, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("should deny access with 403 if user role is not allowed", () => {
    req.user = { id: "u1", username: "cashier", role: "CASHIER" };
    const middleware = roleMiddleware(["ADMIN"]);

    middleware(req as AuthRequest, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = (next as jest.Mock).mock.calls[0][0];
    expect(error.statusCode).toBe(403);
    expect(error.message).toContain("tidak memiliki izin");
  });

  it("should return 401 if req.user is missing", () => {
    const middleware = roleMiddleware(["ADMIN"]);

    middleware(req as AuthRequest, res as Response, next);

    const error = (next as jest.Mock).mock.calls[0][0];
    expect(error.statusCode).toBe(401);
  });
});
