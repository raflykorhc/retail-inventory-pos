import { DebtService } from "./DebtService";
import prisma from "../config/db";

// Mock Prisma
jest.mock("../config/db", () => ({
  __esModule: true,
  default: {
    debt: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    debtPayment: {
      create: jest.fn(),
    },
    sale: {
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

describe("DebtService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("addPayment", () => {
    const mockDebt = { 
      id: "debt-1", 
      remainingBalance: 100000, 
      saleId: "sale-1", 
      status: "UNPAID" 
    };

    it("should process a partial payment correctly", async () => {
      (prisma.debt.findUnique as jest.Mock).mockResolvedValue(mockDebt);

      await DebtService.addPayment("debt-1", { amountPaid: 40000 });

      expect(prisma.debtPayment.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ debtId: "debt-1", amountPaid: 40000 })
      }));
      expect(prisma.debt.update).toHaveBeenCalledWith({
        where: { id: "debt-1" },
        data: { remainingBalance: 60000, status: "PARTIAL" }
      });
      expect(prisma.sale.update).not.toHaveBeenCalled();
    });

    it("should mark as PAID when payment is full", async () => {
      (prisma.debt.findUnique as jest.Mock).mockResolvedValue(mockDebt);

      await DebtService.addPayment("debt-1", { amountPaid: 100000 });

      expect(prisma.debt.update).toHaveBeenCalledWith({
        where: { id: "debt-1" },
        data: { remainingBalance: 0, status: "PAID" }
      });
      expect(prisma.sale.update).toHaveBeenCalledWith({
        where: { id: "sale-1" },
        data: { paymentStatus: "LUNAS" }
      });
    });
  });

  describe("bulkPayment (FIFO)", () => {
    it("should distribute payment across multiple debts using FIFO", async () => {
      const mockDebts = [
        { id: "d1", remainingBalance: 50000, saleId: "s1", status: "UNPAID" },
        { id: "d2", remainingBalance: 100000, saleId: "s2", status: "UNPAID" }
      ];
      
      (prisma.debt.findMany as jest.Mock).mockResolvedValue(mockDebts);

      // Pay 75.000: should pay d1 (50k) fully and d2 (25k) partially
      const result = await DebtService.bulkPayment("cust-1", 75000, "CASH");

      expect(result.paymentsMade).toHaveLength(2);
      expect(prisma.debt.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "d1" },
        data: { remainingBalance: 0, status: "PAID" }
      }));
      expect(prisma.debt.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "d2" },
        data: { remainingBalance: 75000, status: "PARTIAL" }
      }));
      expect(result.remainingAmountUnused).toBe(0);
    });
  });
});
