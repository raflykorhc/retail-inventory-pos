import { StockReportService } from "./StockReportService";
import prisma from "../config/db";

// Mock Prisma
jest.mock("../config/db", () => ({
  __esModule: true,
  default: {
    stockLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
  },
}));

describe("StockReportService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getMovements", () => {
    it("should fetch stock logs with filters and pagination", async () => {
      (prisma.stockLog.findMany as jest.Mock).mockResolvedValue([{ id: "log-1", type: "IN" }]);
      (prisma.stockLog.count as jest.Mock).mockResolvedValue(1);

      const result = await StockReportService.getMovements({
        startDate: "2026-05-01",
        endDate: "2026-05-10",
        type: "IN",
        categoryId: "cat-1",
        page: 1,
        limit: 10
      });

      expect(prisma.stockLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          type: "IN",
          product: { categoryId: "cat-1" },
          createdAt: expect.any(Object) // gte and lte
        }),
        skip: 0,
        take: 10
      }));
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe("getSummary", () => {
    it("should calculate asset value correctly using FIFO batches and fallbacks", async () => {
      const mockProducts = [
        {
          id: "prod-1",
          stock: 10,
          minStock: 5,
          averageCost: 40000,
          supplier: { name: "Supplier A" },
          stockBatches: [
            { currentQuantity: 5, costPrice: 38000 },
            { currentQuantity: 5, costPrice: 42000 }
          ]
        },
        {
          id: "prod-2",
          stock: 3, // Low stock since 3 <= 5
          minStock: 5,
          averageCost: 50000, // Used as fallback because no batches
          supplier: null, // Should go to "Tanpa Pemasok"
          stockBatches: []
        }
      ];

      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

      const summary = await StockReportService.getSummary();

      // Product 1 Asset: (5 * 38000) + (5 * 42000) = 190000 + 210000 = 400000
      // Product 2 Asset (Fallback): 3 * 50000 = 150000
      // Total Asset = 550000
      expect(summary.totalAssetValue).toBe(550000);
      
      // Total items: 10 + 3 = 13
      expect(summary.totalItems).toBe(13);
      
      // Low stock: prod-2 (3 <= 5) -> 1
      expect(summary.lowStockCount).toBe(1);

      // Valuation by supplier
      expect(summary.valuationBySupplier).toEqual([
        { name: "Supplier A", value: 400000 },
        { name: "Tanpa Pemasok", value: 150000 }
      ]);
    });
  });
});
