import { ProductService } from "./ProductService";
import prisma from "../config/db";

// Mock Prisma
jest.mock("../config/db", () => ({
  __esModule: true,
  default: {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    productPrice: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    stockBatch: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    stockLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    auditLogs: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

jest.mock("./AuditService.ts", () => ({
  AuditService: {
    log: jest.fn().mockResolvedValue(true),
  },
}));

describe("ProductService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a product and its initial batch/log if initial stock is provided", async () => {
      const mockData = {
        name: "Semen",
        categoryId: "cat-1",
        unitId: "unit-1",
        price: 50000,
        initialStock: 100,
        initialCost: 40000
      };

      (prisma.product.create as jest.Mock).mockResolvedValue({ id: "prod-1", name: "Semen", stock: 100 });

      await ProductService.create(mockData);

      expect(prisma.product.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ name: "Semen", stock: 100, averageCost: 40000 })
      }));
      expect(prisma.stockBatch.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ productId: "prod-1", initialQuantity: 100, costPrice: 40000 })
      }));
      expect(prisma.stockLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ productId: "prod-1", type: "IN", quantity: 100 })
      }));
    });
  });

  describe("update (Multi-unit re-scaling)", () => {
    it("should correctly rescale stock and batches when base unit conversion factor changes", async () => {
      // Scenario: Product was initially "Karung" (1). Now updating to "KOL" (1 KOL = 50 Karung)
      // The user edits the base unit to have CF=50 relative to the NEW base unit, but wait:
      // Re-scaling logic:
      // oldBase = { unitId: 'u1', CF: 1 }
      // newPrices = [ { unitId: 'u1', CF: 50 } ]  <- old base is now worth 50 of the new base unit!
      // So shift = 50. Stock should multiply by 50. Cost should divide by 50.
      
      const updateData = {
        name: "Semen",
        prices: [{ unitId: "unit-1", conversionFactor: 50, price: 50000 }] 
      };

      (prisma.productPrice.findMany as jest.Mock).mockResolvedValue([
        { unitId: "unit-1", conversionFactor: 1, price: 50000 } // old base
      ]);
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: "prod-1", stock: 10, minStock: 2, averageCost: 40000
      });
      (prisma.stockBatch.findMany as jest.Mock).mockResolvedValue([
        { id: "batch-1", initialQuantity: 10, currentQuantity: 10, costPrice: 40000, sellingPrice: 50000 }
      ]);
      (prisma.product.update as jest.Mock).mockResolvedValue({});

      await ProductService.update("prod-1", updateData);

      // Verify product stock rescaling
      // 10 * 50 = 500 stock. Cost 40000 / 50 = 800.
      expect(prisma.product.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "prod-1" },
        data: expect.objectContaining({ stock: 500, minStock: 100, averageCost: 800 })
      }));

      // Verify batch rescaling
      expect(prisma.stockBatch.update).toHaveBeenCalledWith({
        where: { id: "batch-1" },
        data: expect.objectContaining({
          initialQuantity: 500,
          currentQuantity: 500,
          costPrice: 800,
          sellingPrice: 1000
        })
      });

      // Verify prices recreations
      expect(prisma.productPrice.deleteMany).toHaveBeenCalled();
      expect(prisma.productPrice.createMany).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should perform a soft delete", async () => {
      const mockProduct = { id: "1", name: "Product 1", code: "P1" };
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      await ProductService.delete("1", "user-1");

      expect(prisma.product.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "1" },
        data: { deletedAt: expect.any(Date) }
      }));
    });
  });
});
