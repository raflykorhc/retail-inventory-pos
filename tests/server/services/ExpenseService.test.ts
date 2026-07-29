import { ExpenseService } from "./ExpenseService";
import prisma from "../config/db";
import { ApiError } from "../utils/ApiError";

jest.mock("../config/db", () => ({
  __esModule: true,
  default: {
    expense: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe("ExpenseService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create an expense", async () => {
      const mockData = {
        category: "Listrik",
        amount: 500000,
        description: "Bayar token",
        date: "2026-05-10"
      };

      (prisma.expense.create as jest.Mock).mockResolvedValue({ id: "exp-1", ...mockData });

      await ExpenseService.create(mockData);

      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: "Listrik",
          amount: 500000,
          description: "Bayar token",
          date: expect.any(Date)
        })
      });
    });

    it("should throw error if category or amount is missing", async () => {
      await expect(ExpenseService.create({ category: "", amount: 0, date: "2026-05-10" })).rejects.toThrow(ApiError);
    });
  });

  describe("update", () => {
    it("should update expense details", async () => {
      (prisma.expense.update as jest.Mock).mockResolvedValue({ id: "exp-1" });

      await ExpenseService.update("exp-1", { amount: 600000, category: "Operasional" });

      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: "exp-1" },
        data: expect.objectContaining({
          amount: 600000,
          category: "Operasional"
        })
      });
    });
  });

  describe("delete", () => {
    it("should hard delete an expense", async () => {
      (prisma.expense.delete as jest.Mock).mockResolvedValue({ id: "exp-1" });

      const res = await ExpenseService.delete("exp-1");

      expect(prisma.expense.delete).toHaveBeenCalledWith({ where: { id: "exp-1" } });
      expect(res.success).toBe(true);
    });
  });
});
