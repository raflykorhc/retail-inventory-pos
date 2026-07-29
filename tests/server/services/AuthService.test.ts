import { AuthService } from "./AuthService";
import prisma from "../config/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError";

// Mock dependencies
jest.mock("../config/db", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

jest.mock("./AuditService.ts", () => ({
  AuditService: {
    log: jest.fn(),
  },
}));

describe("AuthService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    const mockUser = {
      id: "u1",
      username: "admin",
      password: "hashed_password",
      isActive: true,
      role: "ADMIN",
    };

    it("should return user and token on successful login", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue("mock_token");

      const result = await AuthService.login({ username: "admin", password: "password123" });

      expect(result.token).toBe("mock_token");
      expect(result.user.username).toBe("admin");
      expect(prisma.user.update).toHaveBeenCalled(); // Last login update
    });

    it("should throw error if user not found", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.login({ username: "wrong", password: "p" })).rejects.toThrow(ApiError);
      await expect(AuthService.login({ username: "wrong", password: "p" })).rejects.toThrow(/salah/);
    });

    it("should throw error if password does not match", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(AuthService.login({ username: "admin", password: "wrong_password" })).rejects.toThrow(ApiError);
    });

    it("should throw error if user is inactive", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });

      await expect(AuthService.login({ username: "admin", password: "p" })).rejects.toThrow(ApiError);
    });
  });

  describe("register", () => {
    it("should successfully register a new user", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_pass");
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "new-u",
        username: "newuser",
        password: "hashed_pass",
        fullName: "New User",
        role: "CASHIER"
      });

      const result = await AuthService.register({
        username: "newuser",
        password: "password123",
        fullName: "New User"
      });

      expect(result.username).toBe("newuser");
      expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ password: "hashed_pass" })
      }));
    });

    it("should throw error if username already exists", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "existing" });

      await expect(AuthService.register({ username: "admin", password: "p" })).rejects.toThrow(/Username sudah digunakan/);
    });
  });
});
