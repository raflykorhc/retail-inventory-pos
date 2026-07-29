import { SalesService } from "./SalesService";
import prisma from "../config/db";
import { ApiError } from "../utils/ApiError";

// Mock Prisma
jest.mock("../config/db", () => ({
  __esModule: true,
  default: {
    sale: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    saleItem: {
      create: jest.fn(),
    },
    saleItemBatch: {
      create: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    stockBatch: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    stockLog: {
      create: jest.fn(),
    },
    debt: {
      create: jest.fn(),
    },
    auditLogs: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: "user-1", username: "cashier", fullName: "Cashier" }),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

jest.mock("./AuditService.ts", () => ({
  AuditService: {
    log: jest.fn().mockResolvedValue(true),
  },
}));

describe("SalesService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const mockSaleData = {
      customerId: "cust-1",
      items: [
        { id: "prod-1", productId: "prod-1", quantity: 2, price: 50000, unitId: "unit-1", name: "Semen" }
      ],
      totalAmount: 100000,
      paymentMethod: "CASH",
      userId: "user-1"
    };

    it("should successfully create a sale and deduct stock using FIFO", async () => {
      // Setup mocks
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: "prod-1",
        name: "Semen",
        stock: 10,
        averageCost: 40000,
        prices: [{ unitId: "unit-1", price: 50000, conversionFactor: 1 }]
      });
      (prisma.sale.create as jest.Mock).mockResolvedValue({
        id: "sale-1",
        invoiceNumber: "INV-123",
        totalAmount: 100000
      });
      (prisma.saleItem.create as jest.Mock).mockResolvedValue({
        id: "sale-item-1",
      });
      (prisma.stockBatch.findMany as jest.Mock).mockResolvedValue([
        { id: "batch-1", currentQuantity: 5, costPrice: 40000 }
      ]);
      (prisma.stockBatch.update as jest.Mock).mockResolvedValue({});
      (prisma.saleItemBatch.create as jest.Mock).mockResolvedValue({});

      const result = await SalesService.create(mockSaleData);

      expect(prisma.sale.create).toHaveBeenCalled();
      expect(prisma.stockBatch.findMany).toHaveBeenCalled();
      expect(prisma.stockBatch.update).toHaveBeenCalledWith({
        where: { id: "batch-1" },
        data: { currentQuantity: { decrement: 2 } }
      });
      expect(prisma.saleItemBatch.create).toHaveBeenCalledWith({
        data: {
          saleItemId: "sale-item-1",
          batchId: "batch-1",
          quantity: 2,
          costPrice: 40000
        }
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: "prod-1" },
        data: { stock: { decrement: 2 } }
      });
      expect(prisma.stockLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: "OUT", quantity: 2 })
      }));
      expect(result.invoiceNumber).toBe("INV-123");
    });

    it("should throw error if product stock is insufficient", async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: "prod-1",
        name: "Semen",
        stock: 1, // Only 1 in stock
        averageCost: 40000,
        prices: [{ unitId: "unit-1", price: 50000, conversionFactor: 1 }]
      });

      await expect(SalesService.create(mockSaleData)).rejects.toThrow(ApiError);
      await expect(SalesService.create(mockSaleData)).rejects.toThrow(/Stok tidak mencukupi/);
    });

    it("should process multi-batch FIFO correctly", async () => {
      const largeSaleData = {
        ...mockSaleData,
        items: [{ id: "prod-1", productId: "prod-1", quantity: 8, price: 50000, unitId: "unit-1", name: "Semen" }]
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: "prod-1",
        name: "Semen",
        stock: 10,
        averageCost: 40000,
        prices: [{ unitId: "unit-1", price: 50000, conversionFactor: 1 }]
      });
      (prisma.sale.create as jest.Mock).mockResolvedValue({ id: "sale-1", invoiceNumber: "INV-124" });
      (prisma.saleItem.create as jest.Mock).mockResolvedValue({ id: "sale-item-1" });
      
      // Two batches: one with 5 items, another with 5 items. Total requested: 8.
      (prisma.stockBatch.findMany as jest.Mock).mockResolvedValue([
        { id: "batch-1", currentQuantity: 5, costPrice: 38000 },
        { id: "batch-2", currentQuantity: 5, costPrice: 42000 }
      ]);

      await SalesService.create(largeSaleData);

      // Verify batch 1 depleted
      expect(prisma.stockBatch.update).toHaveBeenCalledWith({
        where: { id: "batch-1" },
        data: { currentQuantity: { decrement: 5 } }
      });
      // Verify batch 2 partially depleted
      expect(prisma.stockBatch.update).toHaveBeenCalledWith({
        where: { id: "batch-2" },
        data: { currentQuantity: { decrement: 3 } }
      });
    });

    it("should throw error if FIFO fails (data out of sync)", async () => {
      const largeSaleData = {
        ...mockSaleData,
        items: [{ id: "prod-1", productId: "prod-1", quantity: 8, price: 50000, unitId: "unit-1", name: "Semen" }]
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: "prod-1",
        name: "Semen",
        stock: 10, // Stock says 10
        averageCost: 40000,
        prices: [{ unitId: "unit-1", price: 50000, conversionFactor: 1 }]
      });
      (prisma.sale.create as jest.Mock).mockResolvedValue({ id: "sale-1", invoiceNumber: "INV-124" });
      (prisma.saleItem.create as jest.Mock).mockResolvedValue({ id: "sale-item-1" });
      
      // But batches only have 5 total! (Simulate out of sync)
      (prisma.stockBatch.findMany as jest.Mock).mockResolvedValue([
        { id: "batch-1", currentQuantity: 5, costPrice: 38000 }
      ]);

      await expect(SalesService.create(largeSaleData)).rejects.toThrow(/Gagal memproses FIFO/);
    });

    it("should create a debt record if payment method is DEBT", async () => {
      const debtSaleData = { ...mockSaleData, paymentMethod: "DEBT" };
      
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({ 
        id: "prod-1", stock: 10, name: "Semen",
        prices: [{ unitId: "unit-1", price: 50000, conversionFactor: 1 }]
      });
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue({ id: "cust-1", creditLimit: 500000, debts: [] });
      (prisma.sale.create as jest.Mock).mockResolvedValue({ id: "sale-1", invoiceNumber: "INV-123" });
      (prisma.saleItem.create as jest.Mock).mockResolvedValue({ id: "sale-item-1" });
      (prisma.stockBatch.findMany as jest.Mock).mockResolvedValue([{ id: "batch-1", currentQuantity: 10, costPrice: 40000 }]);

      await SalesService.create(debtSaleData);

      expect(prisma.debt.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          amountDue: 100000,
          status: "UNPAID"
        })
      }));
    });

    it("should throw error if customer exceeds credit limit", async () => {
      const debtSaleData = { ...mockSaleData, paymentMethod: "DEBT", totalAmount: 1000000 };
      
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue({
        id: "cust-1",
        creditLimit: 500000, // Limit 500k
        debts: [{ remainingBalance: 0 }]
      });

      await expect(SalesService.create(debtSaleData)).rejects.toThrow(/Limit kredit terlampaui/);
    });

    it("should handle mixed bonus and paid items correctly", async () => {
      const mixedSaleData = {
        customerId: "cust-1",
        items: [
          { id: "prod-1", productId: "prod-1", quantity: 1, price: 50000, unitId: "unit-1", name: "Semen" },
          { id: "prod-2", productId: "prod-2", quantity: 1, price: 20000, unitId: "unit-1", name: "Paku", isBonus: true }
        ],
        totalAmount: 50000,
        paymentMethod: "CASH",
        userId: "user-1"
      };

      (prisma.product.findUnique as jest.Mock).mockImplementation((args) => {
        if (args.where.id === "prod-1") {
          return Promise.resolve({
            id: "prod-1",
            name: "Semen",
            stock: 10,
            averageCost: 40000,
            prices: [{ unitId: "unit-1", price: 50000, conversionFactor: 1 }]
          });
        }
        return Promise.resolve({
          id: "prod-2",
          name: "Paku",
          stock: 10,
          averageCost: 15000,
          prices: [{ unitId: "unit-1", price: 20000, conversionFactor: 1 }]
        });
      });

      (prisma.sale.create as jest.Mock).mockResolvedValue({
        id: "sale-1",
        invoiceNumber: "INV-123-MIXED",
        totalAmount: 50000
      });
      (prisma.saleItem.create as jest.Mock).mockResolvedValue({
        id: "sale-item-1",
      });
      (prisma.stockBatch.findMany as jest.Mock).mockResolvedValue([
        { id: "batch-1", currentQuantity: 5, costPrice: 40000 }
      ]);

      const result = await SalesService.create(mixedSaleData);

      expect(prisma.sale.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          totalAmount: 50000
        })
      }));
      expect(prisma.saleItem.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          productId: "prod-2",
          priceAtSale: 0,
          isBonus: true
        })
      }));
      expect(result.totalAmount).toBe(50000);
    });
  });

  describe("getSummary", () => {
    it("should return correct financial summary", async () => {
      (prisma.sale.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalAmount: 1000000 },
        _count: 5
      });
      (prisma.sale.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.sale.findMany as jest.Mock).mockResolvedValue([
        {
          createdAt: new Date(),
          totalAmount: 100000,
          items: [
            { 
              quantity: 2, 
              priceAtSale: 50000, 
              isBonus: false,
              unitId: "unit-1",
              product: { 
                averageCost: 30000, 
                name: "Semen",
                prices: [{ unitId: "unit-1", price: 50000 }]
              },
              batchAllocations: [{ quantity: 2, costPrice: 30000 }] 
            }
          ]
        }
      ]);

      const summary = await SalesService.getSummary({});

      expect(summary.totalRevenue).toBe(1000000);
      expect(summary.totalTransactions).toBe(5);
      // Cost = 30000 * 2 = 60000. Revenue (from aggregate) = 1000000. Profit = 940000.
      expect(summary.grossProfit).toBe(1000000 - 60000);
      expect(summary.totalBonusQty).toBe(0);
      expect(summary.totalBonusCost).toBe(0);
      expect(summary.totalBonusValue).toBe(0);
    });

    it("should correctly calculate bonus stats in summary", async () => {
      (prisma.sale.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalAmount: 100000 },
        _count: 1
      });
      (prisma.sale.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.sale.findMany as jest.Mock).mockResolvedValue([
        {
          createdAt: new Date(),
          totalAmount: 100000,
          items: [
            { 
              quantity: 2, 
              priceAtSale: 50000, 
              isBonus: false,
              unitId: "unit-1",
              product: { 
                averageCost: 30000, 
                name: "Semen",
                prices: [{ unitId: "unit-1", price: 50000 }]
              },
              batchAllocations: [{ quantity: 2, costPrice: 30000 }] 
            },
            { 
              quantity: 3, 
              priceAtSale: 0, 
              isBonus: true,
              unitId: "unit-1",
              product: { 
                averageCost: 10000, 
                name: "Paku",
                prices: [{ unitId: "unit-1", price: 15000 }]
              },
              batchAllocations: [{ quantity: 3, costPrice: 10000 }] 
            }
          ]
        }
      ]);

      const summary = await SalesService.getSummary({});

      expect(summary.totalRevenue).toBe(100000);
      expect(summary.totalTransactions).toBe(1);
      // Paid cost: 30000 * 2 = 60000
      // Bonus cost: 10000 * 3 = 30000
      // Total cost = 90000
      // Profit = 100000 (revenue) - 90000 (total cost) = 10000
      expect(summary.grossProfit).toBe(10000);
      expect(summary.totalBonusQty).toBe(3);
      expect(summary.totalBonusCost).toBe(30000);
      // Bonus market value: 15000 (standard price) * 3 = 45000
      expect(summary.totalBonusValue).toBe(45000);
    });
  });
});

