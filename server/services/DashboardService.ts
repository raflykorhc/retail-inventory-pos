import prisma from "../config/db.ts";
import { ApiError } from "../utils/ApiError.ts";

const dashboardCache = new Map<string, { data: any, expiry: number }>();
const CACHE_TTL_MS = 60000;

export class DashboardService {
  static parseLocalDate(dateStr: string, isEnd = false) {
    if (!dateStr) return null;
    const cleanStr = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = cleanStr.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const [year, month, day] = parts;
    if (isEnd) {
      return new Date(year, month - 1, day, 23, 59, 59, 999);
    }
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  static async getStats(startDate?: string, endDate?: string) {
    const cacheKey = `stats_${startDate || 'all'}_${endDate || 'all'}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const now = new Date();
    let currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let currentEnd = new Date();

    if (startDate && endDate) {
      const parsedStart = DashboardService.parseLocalDate(startDate, false);
      const parsedEnd = DashboardService.parseLocalDate(endDate, true);
      if (parsedStart && parsedEnd) {
        currentStart = parsedStart;
        currentEnd = parsedEnd;
      }
    }

    const durationMs = currentEnd.getTime() - currentStart.getTime();
    const prevStart = new Date(currentStart.getTime() - durationMs);
    const prevEnd = new Date(currentEnd.getTime() - durationMs);

    // --- Current Period Optimized Queries ---
    const currentSales = await prisma.sale.findMany({
      where: { createdAt: { gte: currentStart, lte: currentEnd }, deletedAt: null },
      select: {
        id: true,
        invoiceNumber: true,
        createdAt: true,
        totalAmount: true,
        paymentStatus: true,
        paymentMethod: true,
        userId: true,
        user: { select: { fullName: true } },
        items: {
          select: {
            productId: true,
            quantity: true,
            priceAtSale: true,
            product: {
              select: {
                name: true,
                averageCost: true
              }
            },
            batchAllocations: {
              select: {
                quantity: true,
                costPrice: true
              }
            }
          }
        }
      }
    });

    const currentPurchases = await prisma.purchase.findMany({
      where: { createdAt: { gte: currentStart, lte: currentEnd } },
      select: {
        createdAt: true,
        totalAmount: true,
      }
    });

    // --- Previous Period Optimized Queries ---
    const prevSales = await prisma.sale.findMany({
      where: { createdAt: { gte: prevStart, lte: prevEnd }, deletedAt: null },
      select: {
        totalAmount: true,
        items: {
          select: {
            quantity: true,
            product: {
              select: {
                averageCost: true
              }
            },
            batchAllocations: {
              select: {
                quantity: true,
                costPrice: true
              }
            }
          }
        }
      }
    });

    // --- Helper Functions for Calculation ---
    const calcRevenue = (sales: any[]) => sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    
    const calcHPP = (sales: any[]) => sales.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum: number, item: any) => {
        let itemCost = 0;
        if (item.batchAllocations && item.batchAllocations.length > 0) {
          itemCost = item.batchAllocations.reduce((bSum: number, b: any) => bSum + (Number(b.costPrice) * b.quantity), 0);
        } else {
          itemCost = (item.quantity * Number(item.product?.averageCost || 0));
        }
        return itemSum + itemCost;
      }, 0);
    }, 0);

    const calcPurchaseSpending = (purchases: any[]) => purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);

    const currentRevenue = calcRevenue(currentSales);
    const currentHPP = calcHPP(currentSales);
    const currentPurchaseSpending = calcPurchaseSpending(currentPurchases);
    
    const currentGrossProfit = currentRevenue - currentHPP;
    const currentNetProfit = currentGrossProfit; // no operational expenses

    const prevRevenue = calcRevenue(prevSales);
    const prevHPP = calcHPP(prevSales);
    
    const prevGrossProfit = prevRevenue - prevHPP;
    const prevNetProfit = prevGrossProfit;

    const calcTrend = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 12.5 : 0;
      return ((current - prev) / prev) * 100;
    };

    // --- Chart Data: Sales & Cash Flow Trend ---
    const daysDiff = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    const salesTrend = [];
    const cashFlow = [];

    if (daysDiff <= 31) {
      for (let i = 0; i <= daysDiff; i++) {
        const date = new Date(currentStart.getTime() + i * 24 * 60 * 60 * 1000);
        const dateISO = date.toISOString().split("T")[0];
        const dateLabel = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

        const daySales = currentSales.filter(s => s.createdAt.toISOString().split("T")[0] === dateISO);
        const dayPurchases = currentPurchases.filter(p => p.createdAt.toISOString().split("T")[0] === dateISO);

        const amount = calcRevenue(daySales);
        const hpp = calcHPP(daySales);
        const profit = amount - hpp;

        const inflow = amount;
        const outflow = calcPurchaseSpending(dayPurchases);

        salesTrend.push({ date: dateLabel, amount, hpp, profit });
        cashFlow.push({ date: dateLabel, inflow, outflow });
      }
    } else {
      let current = new Date(currentStart.getFullYear(), currentStart.getMonth(), 1);
      while (current <= currentEnd) {
        const year = current.getFullYear();
        const month = current.getMonth();
        const dateLabel = current.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });

        const monthSales = currentSales.filter(s => s.createdAt.getFullYear() === year && s.createdAt.getMonth() === month);
        const monthPurchases = currentPurchases.filter(p => p.createdAt.getFullYear() === year && p.createdAt.getMonth() === month);

        const amount = calcRevenue(monthSales);
        const hpp = calcHPP(monthSales);
        const profit = amount - hpp;

        const inflow = amount;
        const outflow = calcPurchaseSpending(monthPurchases);

        salesTrend.push({ date: dateLabel, amount, hpp, profit });
        cashFlow.push({ date: dateLabel, inflow, outflow });

        current.setMonth(current.getMonth() + 1);
      }
    }

    // --- Domain Aggregations (Top Products & Top Cashiers) ---
    const productSalesMap: Record<string, { name: string, sales: number, revenue: number }> = {};
    currentSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { name: item.product.name, sales: 0, revenue: 0 };
        }
        productSalesMap[item.productId].sales += item.quantity;
        productSalesMap[item.productId].revenue += (item.quantity * Number(item.priceAtSale));
      });
    });
    const topProducts = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const cashierSalesMap: Record<string, { name: string, revenue: number, transactionCount: number }> = {};
    currentSales.forEach(sale => {
      const cashierId = sale.userId || "general";
      const cashierName = sale.user?.fullName || "Umum";
      if (!cashierSalesMap[cashierId]) {
        cashierSalesMap[cashierId] = { name: cashierName, revenue: 0, transactionCount: 0 };
      }
      cashierSalesMap[cashierId].revenue += Number(sale.totalAmount);
      cashierSalesMap[cashierId].transactionCount += 1;
    });
    const topCashiers = Object.values(cashierSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // --- Actionable Insights ---
    const lowStockProducts = await prisma.product.findMany({
      where: { stock: { lte: prisma.product.fields.minStock }, deletedAt: null },
      select: { name: true, stock: true, minStock: true },
      take: 5
    });

    const lowStockCount = await prisma.product.count({
      where: { stock: { lte: prisma.product.fields.minStock }, deletedAt: null }
    });

    const totalTransactions = currentSales.length;
    const prevTotalTransactions = prevSales.length;
    const averageTransaction = totalTransactions > 0 ? (currentRevenue / totalTransactions) : 0;

    const recentSales = [...currentSales]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        invoiceNumber: s.invoiceNumber,
        totalAmount: Number(s.totalAmount),
        paymentMethod: s.paymentMethod,
        paymentStatus: s.paymentStatus,
        cashierName: s.user?.fullName || "Umum",
        createdAt: s.createdAt,
        itemCount: s.items.length
      }));

    const result = {
      metrics: {
        totalRevenue: currentRevenue,
        revenueTrend: calcTrend(currentRevenue, prevRevenue),
        totalHPP: currentHPP,
        grossProfit: currentGrossProfit,
        netProfit: currentNetProfit,
        netProfitTrend: calcTrend(currentNetProfit, prevNetProfit),
        profitMargin: currentRevenue > 0 ? (currentNetProfit / currentRevenue) * 100 : 0,
        totalTransactions,
        transactionTrend: calcTrend(totalTransactions, prevTotalTransactions),
        averageTransaction,
      },
      salesTrend,
      cashFlow,
      topProducts,
      topCashiers,
      recentSales,
      insights: {
        lowStock: lowStockProducts,
        lowStockCount,
      }
    };

    dashboardCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });
    return result;
  }
}
