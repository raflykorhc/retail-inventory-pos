import { ReturnService } from "./ReturnService";
import prisma from "../config/db";

// Mock Prisma
jest.mock("../config/db", () => ({
  __esModule: true,
  default: {
    return: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    saleItem: {
      findFirst: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    stockBatch: {
      create: jest.fn(),
    },
    stockLog: {
      create: jest.fn(),
    },
    debt: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    debtPayment: {
      create: jest.fn(),
    },
    sale: {
      update: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

describe("ReturnService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const mockReturnData = {
      saleId: "sale-1",
      customerId: "cust-1",
      reason: "Salah ukuran",
      resolution: "REFUND",
      items: [
        { productId: "prod-1", quantity: 2, price: 50000, condition: "GOOD" }
      ]
    };

    it("should successfully process return and restore stock for GOOD condition", async () => {
      (prisma.return.create as jest.Mock).mockResolvedValue({ id: "ret-1", returnNumber: "RET-123", totalAmount: 100000 });
      (prisma.saleItem.findFirst as jest.Mock).mockResolvedValue({
        batchAllocations: [{ costPrice: 40000 }]
      });
      (prisma.product.update as jest.Mock).mockResolvedValue({});
      (prisma.stockBatch.create as jest.Mock).mockResolvedValue({});

      await ReturnService.create(mockReturnData);

      expect(prisma.return.create).toHaveBeenCalled();
      
      // Verification of stock recovery
      expect(prisma.stockBatch.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ productId: "prod-1", currentQuantity: 2, costPrice: 40000 })
      }));
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: "prod-1" },
        data: { stock: { increment: 2 } }
      });
      expect(prisma.stockLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: "IN", quantity: 2 })
      }));
    });

    it("should not restore stock if condition is DAMAGED", async () => {
      const damagedData = {
        ...mockReturnData,
        items: [{ productId: "prod-1", quantity: 2, price: 50000, condition: "DAMAGED" }]
      };

      (prisma.return.create as jest.Mock).mockResolvedValue({ id: "ret-1", returnNumber: "RET-123" });

      await ReturnService.create(damagedData);

      // It should NOT call stockBatch.create or product.update for DAMAGED items
      expect(prisma.stockBatch.create).not.toHaveBeenCalled();
      expect(prisma.product.update).not.toHaveBeenCalled();
      
      // It should log an ADJUSTMENT
      expect(prisma.stockLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: "ADJUSTMENT", quantity: 0 })
      }));
    });

    it("should deduct debt if resolution is DEDUCT_DEBT", async () => {
      const debtData = { ...mockReturnData, resolution: "DEDUCT_DEBT" };
      
      (prisma.return.create as jest.Mock).mockResolvedValue({ id: "ret-1", totalAmount: 100000 });
      (prisma.saleItem.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({ averageCost: 40000 });
      
      (prisma.debt.findFirst as jest.Mock).mockResolvedValue({ id: "debt-1", remainingBalance: 150000 });
      (prisma.debt.update as jest.Mock).mockResolvedValue({});
      (prisma.debtPayment.create as jest.Mock).mockResolvedValue({});

      await ReturnService.create(debtData);

      expect(prisma.debtPayment.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ amountPaid: 100000, method: "RETURN_DEDUCTION" })
      }));
      expect(prisma.debt.update).toHaveBeenCalledWith({
        where: { id: "debt-1" },
        data: expect.objectContaining({ remainingBalance: 50000, status: "PARTIAL" })
      });
    });


  });
});
