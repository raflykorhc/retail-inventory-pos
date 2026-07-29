import { authMiddleware, AuthRequest } from "./auth.middleware";
import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError";

jest.mock("jsonwebtoken");

describe("authMiddleware", () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should call next() if token is valid", () => {
    req.headers!.authorization = "Bearer valid_token";
    const mockUser = { id: "1", username: "admin", role: "ADMIN" };
    (jwt.verify as jest.Mock).mockReturnValue(mockUser);

    authMiddleware(req as AuthRequest, res as Response, next);

    expect(jwt.verify).toHaveBeenCalled();
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalledWith();
  });

  it("should return 401 error if no token is provided", () => {
    authMiddleware(req as AuthRequest, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = (next as jest.Mock).mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain("silakan login kembali");
  });

  it("should return 401 error if token format is invalid", () => {
    req.headers!.authorization = "InvalidFormat abc";
    authMiddleware(req as AuthRequest, res as Response, next);

    const error = (next as jest.Mock).mock.calls[0][0];
    expect(error.statusCode).toBe(401);
  });

  it("should return 401 error if token verification fails", () => {
    req.headers!.authorization = "Bearer invalid";
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    authMiddleware(req as AuthRequest, res as Response, next);

    const error = (next as jest.Mock).mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain("Sesi kadaluarsa");
  });
});
