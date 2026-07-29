import prisma from "../config/db.ts";

const summaryCache = new Map<string, { data: any; timestamp: number }>();

export class StockReportService {
  /**
   * Mengambil data mutasi stok dengan filter tanggal dan kategori
   */
  static async getMovements(filters: { startDate?: string; endDate?: string; categoryId?: string; type?: string; page?: number; limit?: number }) {
    const where: any = {};
    
    // Filter Date Range
    if (filters.startDate && filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { 
        gte: new Date(filters.startDate), 
        lte: end 
      };
    }

    // Filter Type (IN/OUT)
    if (filters.type) {
      where.type = filters.type;
    }

    // Filter by Category (requires joining through product)
    if (filters.categoryId) {
      where.product = {
        categoryId: filters.categoryId
      };
    }

    const skip = filters.page && filters.limit ? (filters.page - 1) * filters.limit : undefined;
    const take = filters.limit ? Number(filters.limit) : undefined;

    const [items, total] = await Promise.all([
      prisma.stockLog.findMany({
        where,
        include: {
          product: {
            include: {
              category: true,
              supplier: true,
              prices: { include: { unit: true } }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take
      }),
      prisma.stockLog.count({ where })
    ]);

    return { items, total };
  }

  /**
   * Mengambil ringkasan aset stok dan informasi stok rendah
   */
  static async getSummary() {
    const cacheKey = "stock_summary_all";
    const cached = summaryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        supplier: {
          select: { name: true }
        },
        stockBatches: {
          where: { currentQuantity: { gt: 0 } }
        }
      }
    });

    let totalAssetValue = 0;
    let lowStockCount = 0;
    let totalItems = 0;
    const supplierValuationMap: Record<string, number> = {};

    products.forEach(p => {
      // Calculate asset value using FIFO batches
      let productAssetValue = 0;
      if (p.stockBatches && p.stockBatches.length > 0) {
        productAssetValue = p.stockBatches.reduce((sum, b) => sum + (Number(b.currentQuantity) * Number(b.costPrice)), 0);
      } else if (p.stock > 0) {
        // Fallback for legacy data
        productAssetValue = Number(p.stock) * Number(p.averageCost || 0);
      }

      totalAssetValue += productAssetValue;
      totalItems += Number(p.stock);

      const supplierName = p.supplier?.name || "Tanpa Pemasok";
      supplierValuationMap[supplierName] = (supplierValuationMap[supplierName] || 0) + productAssetValue;
      
      if (p.stock <= p.minStock) {
        lowStockCount++;
      }
    });

    const valuationBySupplier = Object.keys(supplierValuationMap).map(name => ({
      name,
      value: supplierValuationMap[name]
    })).sort((a, b) => b.value - a.value);

    const result = {
      totalAssetValue,
      totalItems,
      lowStockCount,
      totalProducts: products.length,
      valuationBySupplier
    };

    summaryCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }
}
