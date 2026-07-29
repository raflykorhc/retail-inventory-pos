import prisma from "../config/db.ts";
import { ApiError } from "../utils/ApiError.ts";

const dashboardCache = new Map<string, { data: any, expiry: number }>();
const CACHE_TTL_MS = 60000; // 60 seconds In-Memory Cache Sisi Server (Standar Mitigasi Beban API)

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

    // --- Current Period Optimized Queries (Lightweight Partial Selects) ---
    const currentSales = await prisma.sale.findMany({
      where: { createdAt: { gte: currentStart, lte: currentEnd }, deletedAt: null },
      select: {
        id: true,
        createdAt: true,
        totalAmount: true,
        customerId: true,
        paymentStatus: true,
        paymentMethod: true,
        customer: {
          select: {
            name: true
          }
        },
        debts: {
          select: {
            amountDue: true,
            payments: {
              select: {
                discount: true
              }
            }
          }
        },
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

    const currentExpenses = await prisma.expense.findMany({
      where: { date: { gte: currentStart, lte: currentEnd } },
      select: {
        date: true,
        amount: true,
        categoryRef: { select: { name: true } }
      }
    });

    const debtsAgg = await prisma.debt.aggregate({
      where: {
        status: { not: "PAID" },
        deletedAt: null,
        sale: { createdAt: { gte: currentStart, lte: currentEnd }, deletedAt: null }
      },
      _sum: {
        remainingBalance: true
      }
    });
    const totalBadDebts = Number(debtsAgg._sum.remainingBalance || 0);

    // --- Cash Flow Payments Queries ---
    const currentDebtPayments = await prisma.debtPayment.findMany({
      where: { 
        paymentDate: { gte: currentStart, lte: currentEnd }, 
        debt: { deletedAt: null, sale: { deletedAt: null } },
        method: { not: "RETURN_DEDUCTION" }
      },
      select: {
        paymentDate: true,
        amountPaid: true
      }
    });

    const currentPurchases = await prisma.purchase.findMany({
      where: { createdAt: { gte: currentStart, lte: currentEnd } },
      select: {
        createdAt: true,
        totalAmount: true,
        payables: {
          select: {
            amountDue: true
          }
        }
      }
    });

    const currentPayablePayments = await prisma.payablePayment.findMany({
      where: { paymentDate: { gte: currentStart, lte: currentEnd } },
      select: {
        paymentDate: true,
        amountPaid: true
      }
    });

    const currentReturns = await prisma.return.findMany({
      where: { 
        createdAt: { gte: currentStart, lte: currentEnd },
        OR: [{ saleId: null }, { sale: { deletedAt: null } }]
      },
      select: {
        createdAt: true,
        totalAmount: true,
        resolution: true,
        sale: {
          select: {
            items: {
              select: {
                productId: true,
                quantity: true,
                batchAllocations: { select: { quantity: true, costPrice: true } }
              }
            }
          }
        },
        items: {
          select: {
            productId: true,
            quantity: true,
            product: { select: { averageCost: true } }
          }
        }
      }
    });

    // --- Previous Period Optimized Queries ---
    const prevSales = await prisma.sale.findMany({
      where: { createdAt: { gte: prevStart, lte: prevEnd }, deletedAt: null },
      select: {
        totalAmount: true,
        debts: {
          select: {
            amountDue: true,
            payments: {
              select: {
                discount: true
              }
            }
          }
        },
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

    const prevExpenses = await prisma.expense.findMany({
      where: { date: { gte: prevStart, lte: prevEnd } },
      select: {
        amount: true
      }
    });

    const prevPurchases = await prisma.purchase.findMany({
      where: { createdAt: { gte: prevStart, lte: prevEnd } },
      select: {
        totalAmount: true,
        payables: {
          select: {
            amountDue: true
          }
        }
      }
    });

    const prevPayablePayments = await prisma.payablePayment.findMany({
      where: { paymentDate: { gte: prevStart, lte: prevEnd } },
      select: {
        amountPaid: true
      }
    });

    const prevReturns = await prisma.return.findMany({
      where: { 
        createdAt: { gte: prevStart, lte: prevEnd },
        OR: [{ saleId: null }, { sale: { deletedAt: null } }]
      },
      select: {
        totalAmount: true,
        sale: {
          select: {
            items: {
              select: {
                productId: true,
                quantity: true,
                batchAllocations: { select: { quantity: true, costPrice: true } }
              }
            }
          }
        },
        items: {
          select: {
            quantity: true,
            productId: true,
            product: { select: { averageCost: true } }
          }
        }
      }
    });

    // --- Helper Functions for Calculation ---
    const calcRevenue = (sales: any[]) => sales.reduce((sum, s) => {
      const debtDiscount = s.debts?.reduce((dSum: number, d: any) => 
        dSum + (d.payments?.reduce((pSum: number, p: any) => pSum + Number(p.discount || 0), 0) || 0)
      , 0) || 0;
      return sum + (Number(s.totalAmount) - debtDiscount);
    }, 0);
    
    const calcReturnTotal = (returns: any[]) => returns.reduce((sum, r) => sum + Number(r.totalAmount), 0);

    const calcReturnHPP = (returns: any[]) => returns.reduce((sum, r) => {
      return sum + r.items.reduce((itemSum: number, item: any) => {
        let originalCost = item.quantity * Number(item.product?.averageCost || 0); // fallback
        if (r.sale && r.sale.items) {
          const saleItem = r.sale.items.find((si: any) => si.productId === item.productId);
          if (saleItem) {
            let totalSaleCost = 0;
            if (saleItem.batchAllocations && saleItem.batchAllocations.length > 0) {
              totalSaleCost = saleItem.batchAllocations.reduce((bSum: number, b: any) => bSum + (Number(b.costPrice) * b.quantity), 0);
            } else {
              totalSaleCost = saleItem.quantity * Number(item.product?.averageCost || 0);
            }
            if (saleItem.quantity > 0) {
              const costPerSaleUnit = totalSaleCost / saleItem.quantity;
              originalCost = item.quantity * costPerSaleUnit;
            }
          }
        }
        return itemSum + originalCost;
      }, 0);
    }, 0);
    
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
    
    const calcExpenses = (expenses: any[]) => expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const calcPurchaseSpending = (purchases: any[], payablePayments: any[]) => {
      let total = 0;
      purchases.forEach(p => {
        const payableDue = p.payables.reduce((sum: number, d: any) => sum + Number(d.amountDue), 0);
        total += (Number(p.totalAmount) - payableDue);
      });
      payablePayments.forEach(pp => {
        total += Number(pp.amountPaid);
      });
      return total;
    };

    const currentRevenue = calcRevenue(currentSales) - calcReturnTotal(currentReturns);
    const currentHPP = calcHPP(currentSales) - calcReturnHPP(currentReturns);
    const currentTotalOperationalExpenses = calcExpenses(currentExpenses);
    
    const currentPurchaseSpending = calcPurchaseSpending(currentPurchases, currentPayablePayments);
    const currentTotalExpensesForDashboard = currentTotalOperationalExpenses; // Removed currentPurchaseSpending from P&L Expenses
    
    const currentGrossProfit = currentRevenue - currentHPP;
    const currentNetProfit = currentGrossProfit - currentTotalOperationalExpenses;

    const prevRevenue = calcRevenue(prevSales) - calcReturnTotal(prevReturns);
    const prevHPP = calcHPP(prevSales) - calcReturnHPP(prevReturns);
    const prevTotalOperationalExpenses = calcExpenses(prevExpenses);
    
    const prevPurchaseSpending = calcPurchaseSpending(prevPurchases, prevPayablePayments);
    const prevTotalExpensesForDashboard = prevTotalOperationalExpenses; // Removed prevPurchaseSpending from P&L Expenses
    
    const prevGrossProfit = prevRevenue - prevHPP;
    const prevNetProfit = prevGrossProfit - prevTotalOperationalExpenses;

    const calcTrend = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return ((current - prev) / prev) * 100;
    };

    // --- Chart Data: Sales & Cash Flow Trend ---
    const daysDiff = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    const salesTrend = [];
    const cashFlow = [];

    if (daysDiff <= 31) {
      for (let i = 0; i <= daysDiff; i++) {
        const date = new Date(currentStart.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split("T")[0];

        const daySales = currentSales.filter(s => s.createdAt.toISOString().split("T")[0] === dateStr);
        const dayExpenses = currentExpenses.filter(e => e.date.toISOString().split("T")[0] === dateStr);
        const dayDebtPayments = currentDebtPayments.filter(p => p.paymentDate.toISOString().split("T")[0] === dateStr);
        const dayPurchases = currentPurchases.filter(p => p.createdAt.toISOString().split("T")[0] === dateStr);
        const dayPayablePayments = currentPayablePayments.filter(p => p.paymentDate.toISOString().split("T")[0] === dateStr);
        const dayReturns = currentReturns.filter(r => r.createdAt.toISOString().split("T")[0] === dateStr);

        const amount = calcRevenue(daySales) - calcReturnTotal(dayReturns);
        const hpp = calcHPP(daySales) - calcReturnHPP(dayReturns);

        // Real Cash Inflow = (Sale Total - Sale Initial Debt) + Debt Payments
        let inflow = 0;
        daySales.forEach(s => {
          const debtDue = s.debts.reduce((sum, d) => sum + Number(d.amountDue), 0);
          inflow += (Number(s.totalAmount) - debtDue);
        });
        dayDebtPayments.forEach(p => {
          inflow += Number(p.amountPaid);
        });

        // Real Cash Outflow = General Expenses + (Purchase Total - Purchase Initial Payable) + Payable Payments
        let outflow = calcExpenses(dayExpenses);
        dayPurchases.forEach(p => {
          const payableDue = p.payables.reduce((sum, d) => sum + Number(d.amountDue), 0);
          outflow += (Number(p.totalAmount) - payableDue);
        });
        dayPayablePayments.forEach(p => {
          outflow += Number(p.amountPaid);
        });
        dayReturns.forEach(r => {
          if (r.resolution === "REFUND") {
            outflow += Number(r.totalAmount);
          }
        });

        salesTrend.push({ date: dateStr, amount, hpp });
        cashFlow.push({ date: dateStr, inflow, outflow });
      }
    } else {
      // Correct Multi-Month Grouping (No more hardcoded zeroes)
      let current = new Date(currentStart.getFullYear(), currentStart.getMonth(), 1);
      while (current <= currentEnd) {
        const year = current.getFullYear();
        const month = current.getMonth();
        const label = `${year}-${String(month + 1).padStart(2, "0")}`;

        const monthSales = currentSales.filter(s => s.createdAt.getFullYear() === year && s.createdAt.getMonth() === month);
        const monthExpenses = currentExpenses.filter(e => e.date.getFullYear() === year && e.date.getMonth() === month);
        const monthDebtPayments = currentDebtPayments.filter(p => p.paymentDate.getFullYear() === year && p.paymentDate.getMonth() === month);
        const monthPurchases = currentPurchases.filter(p => p.createdAt.getFullYear() === year && p.createdAt.getMonth() === month);
        const monthPayablePayments = currentPayablePayments.filter(p => p.paymentDate.getFullYear() === year && p.paymentDate.getMonth() === month);
        const monthReturns = currentReturns.filter(r => r.createdAt.getFullYear() === year && r.createdAt.getMonth() === month);

        const amount = calcRevenue(monthSales) - calcReturnTotal(monthReturns);
        const hpp = calcHPP(monthSales) - calcReturnHPP(monthReturns);

        // Real Cash Inflow
        let inflow = 0;
        monthSales.forEach(s => {
          const debtDue = s.debts.reduce((sum, d) => sum + Number(d.amountDue), 0);
          inflow += (Number(s.totalAmount) - debtDue);
        });
        monthDebtPayments.forEach(p => {
          inflow += Number(p.amountPaid);
        });

        // Real Cash Outflow
        let outflow = calcExpenses(monthExpenses);
        monthPurchases.forEach(p => {
          const payableDue = p.payables.reduce((sum, d) => sum + Number(d.amountDue), 0);
          outflow += (Number(p.totalAmount) - payableDue);
        });
        monthPayablePayments.forEach(p => {
          outflow += Number(p.amountPaid);
        });
        monthReturns.forEach(r => {
          if (r.resolution === "REFUND") {
            outflow += Number(r.totalAmount);
          }
        });

        salesTrend.push({ date: label, amount, hpp });
        cashFlow.push({ date: label, inflow, outflow });

        current.setMonth(current.getMonth() + 1);
      }
    }

    // --- Domain Aggregations (Top Products & Top Customers) ---
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

    const customerSalesMap: Record<string, { name: string, revenue: number, transactionCount: number }> = {};
    currentSales.forEach(sale => {
      const customerId = sale.customerId || "general";
      const customerName = sale.customer?.name || "Pelanggan Umum";
      if (!customerSalesMap[customerId]) {
        customerSalesMap[customerId] = { name: customerName, revenue: 0, transactionCount: 0 };
      }
      customerSalesMap[customerId].revenue += Number(sale.totalAmount);
      customerSalesMap[customerId].transactionCount += 1;
    });
    const topCustomers = Object.values(customerSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const expensesByCategory: Record<string, number> = {};
    currentExpenses.forEach(e => {
      const catName = e.categoryRef?.name || "Uncategorized";
      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + Number(e.amount);
    });
    // Do NOT include Pembelian Barang in P&L expensesBreakdown. Purchases are Cash Flow items, COGS (HPP) handles the P&L part.
    const expensesBreakdown = Object.entries(expensesByCategory).map(([category, amount]) => ({ category, amount }));

    // --- Actionable Insights ---
    const lowStockProducts = await prisma.product.findMany({
      where: { stock: { lte: prisma.product.fields.minStock }, deletedAt: null },
      select: { name: true, stock: true, minStock: true },
      take: 5
    });

    const lowStockCount = await prisma.product.count({
      where: { stock: { lte: prisma.product.fields.minStock }, deletedAt: null }
    });

    const upcomingDueDebts = await prisma.debt.findMany({
      where: { 
        status: { not: "PAID" },
        deletedAt: null,
        sale: { deletedAt: null },
        dueDate: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }
      },
      include: { customer: true },
      take: 5
    });

    const uniqueCustomersWithDueDebts = await prisma.debt.groupBy({
      by: ['customerId'],
      where: { 
        status: { not: "PAID" },
        deletedAt: null,
        sale: { deletedAt: null },
        dueDate: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }
      }
    });
    const dueDebtsCount = uniqueCustomersWithDueDebts.length;

    const pendingDeliveries = await prisma.sale.count({
      where: {
        isDeliveryRequired: true,
        deletedAt: null,
        items: {
          some: {
            pendingQuantity: { gt: 0 }
          }
        }
      }
    });

    const result = {
      metrics: {
        totalRevenue: currentRevenue,
        revenueTrend: calcTrend(currentRevenue, prevRevenue),
        totalHPP: currentHPP,
        totalExpenses: currentTotalExpensesForDashboard,
        expensesTrend: calcTrend(currentTotalExpensesForDashboard, prevTotalExpensesForDashboard),
        totalBadDebts,
        grossProfit: currentGrossProfit,
        netProfit: currentNetProfit,
        netProfitTrend: calcTrend(currentNetProfit, prevNetProfit),
        profitMargin: currentRevenue > 0 ? (currentNetProfit / currentRevenue) * 100 : 0
      },
      salesTrend,
      cashFlow,
      topProducts,
      topCustomers,
      expensesBreakdown,
      insights: {
        lowStock: lowStockProducts,
        lowStockCount,
        dueDebts: upcomingDueDebts.map(d => ({ 
          customer: d.customer?.name || "Unknown", 
          amount: Number(d.remainingBalance), 
          dueDate: d.dueDate 
        })),
        dueDebtsCount,
        pendingDeliveries
      }
    };

    dashboardCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });
    return result;
  }
}
