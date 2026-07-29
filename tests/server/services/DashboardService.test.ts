import { DashboardService } from "./DashboardService";
import prisma from "../config/db";

// Mock Prisma
jest.mock("../config/db", () => ({
  __esModule: true,
  default: {
    sale: {
      findMany: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
    },
    debt: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    debtPayment: {
      findMany: jest.fn(),
    },
    purchase: {
      findMany: jest.fn(),
    },
    payablePayment: {
      findMany: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      fields: {
        minStock: "minStock"
      }
    },
    delivery: {
      count: jest.fn(),
    }
  },
}));

describe("DashboardService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getStats", () => {
    it("should calculate revenue, HPP, expenses, and trends correctly", async () => {
      const mockSales = [
        {
          id: "sale-1",
          totalAmount: 100000,
          createdAt: new Date(),
          items: [
            { 
              quantity: 2, 
              priceAtSale: 50000,
              product: { name: "Product A", averageCost: 30000 },
              batchAllocations: [{ costPrice: 35000, quantity: 2 }] // FIFO: 70k HPP
            }
          ],
          customerId: "cust-1",
          customer: { name: "John Doe" },
          debts: []
        }
      ];

      const mockPrevSales = [
        {
          id: "sale-prev",
          totalAmount: 50000,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          items: [
            { 
              quantity: 1, 
              priceAtSale: 50000,
              product: { name: "Product A", averageCost: 30000 },
              batchAllocations: [{ costPrice: 30000, quantity: 1 }] // FIFO: 30k HPP
            }
          ],
          debts: []
        }
      ];

      const mockExpenses = [{ id: "exp-1", amount: 10000, category: "Operasional", date: new Date() }];
      const mockPrevExpenses = [{ id: "exp-prev", amount: 5000, category: "Operasional", date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }];

      // 1st call: currentSales, 2nd call: prevSales
      (prisma.sale.findMany as jest.Mock)
        .mockResolvedValueOnce(mockSales)
        .mockResolvedValueOnce(mockPrevSales);

      // 1st call: currentExpenses, 2nd call: prevExpenses
      (prisma.expense.findMany as jest.Mock)
        .mockResolvedValueOnce(mockExpenses)
        .mockResolvedValueOnce(mockPrevExpenses);

      (prisma.debt.aggregate as jest.Mock).mockResolvedValue({ _sum: { remainingBalance: 0 } });
      (prisma.debtPayment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.purchase.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.payablePayment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.debt.findMany as jest.Mock).mockResolvedValue([{ id: "debt-1", remainingBalance: 20000 }]);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.delivery.count as jest.Mock).mockResolvedValue(0);

      const stats = await DashboardService.getStats();

      // Current logic:
      // Revenue = 100k
      // HPP = 70k
      // Gross Profit = 30k
      // Expenses = 10k
      // Net Profit = 20k
      expect(stats.metrics.totalRevenue).toBe(100000);
      expect(stats.metrics.totalHPP).toBe(70000);
      expect(stats.metrics.grossProfit).toBe(30000);
      expect(stats.metrics.totalExpenses).toBe(10000);
      expect(stats.metrics.netProfit).toBe(20000);

      // Trend logic:
      // Prev Revenue = 50k
      // Revenue Trend = ((100k - 50k) / 50k) * 100 = 100%
      expect(stats.metrics.revenueTrend).toBe(100);

      // Prev Net Profit: Rev(50k) - HPP(30k) - Exp(5k) = 15k
      // Net Profit Trend = ((20k - 15k) / 15k) * 100 = 33.33%
      expect(stats.metrics.netProfitTrend).toBeCloseTo(33.33, 1);

      // Top Products check
      expect(stats.topProducts).toHaveLength(1);
      expect(stats.topProducts[0].revenue).toBe(100000);
      
      // Top Customers check
      expect(stats.topCustomers).toHaveLength(1);
      expect(stats.topCustomers[0].revenue).toBe(100000);

      // Expenses breakdown
      expect(stats.expensesBreakdown).toEqual([{ category: "Operasional", amount: 10000 }]);
    });
  });
});
