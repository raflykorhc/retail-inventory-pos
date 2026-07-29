import prisma from "../config/db.ts";
import { ApiError } from "../utils/ApiError.ts";

const summaryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

export class ExpenseService {
  static async getAll(startDate?: string, endDate?: string, page?: number, limit?: number, search?: string, categoryId?: string) {
    let expenseWhere: any = {};
    let purchaseWhere: any = { paymentStatus: "PAID", payables: { none: {} } };
    let payablePaymentWhere: any = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      expenseWhere.date = {
        gte: start,
        lte: end,
      };
      purchaseWhere.createdAt = {
        gte: start,
        lte: end,
      };
      payablePaymentWhere.paymentDate = {
        gte: start,
        lte: end,
      };
    }

    if (search) {
      expenseWhere.OR = [
        { categoryRef: { name: { contains: search, mode: "insensitive" } } },
        { description: { contains: search, mode: "insensitive" } }
      ];
      
      purchaseWhere.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } }
      ];

      payablePaymentWhere.OR = [
        { payable: { reference: { contains: search, mode: "insensitive" } } },
        { payable: { purchase: { invoiceNumber: { contains: search, mode: "insensitive" } } } },
        { payable: { supplier: { name: { contains: search, mode: "insensitive" } } } }
      ];
    }

    if (categoryId) {
      if (categoryId === "PEMBELIAN_BARANG") {
        // Exclude normal expenses
        expenseWhere.id = { in: [] };
      } else {
        // Filter by specific category ID for normal expenses
        expenseWhere.categoryId = categoryId;
        // Exclude purchases and payables
        purchaseWhere.id = { in: [] };
        payablePaymentWhere.id = { in: [] };
      }
    }

    // Fetch all records within range
    const [expenses, purchases, payablePayments] = await Promise.all([
      prisma.expense.findMany({
        where: expenseWhere,
        include: { categoryRef: true },
        orderBy: { date: "desc" }
      }),
      prisma.purchase.findMany({
        where: purchaseWhere,
        include: { supplier: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.payablePayment.findMany({
        where: payablePaymentWhere,
        include: {
          payable: {
            include: {
              purchase: true,
              supplier: true
            }
          }
        },
        orderBy: { paymentDate: "desc" }
      })
    ]);

    const mappedExpenses = expenses.map(e => ({
      id: e.id,
      date: e.date,
      category: e.categoryRef?.name || "Uncategorized",
      categoryId: e.categoryId,
      amount: Number(e.amount),
      description: e.description,
      receiptPath: e.receiptPath,
      isSystemGenerated: false
    }));

    const mappedPurchases = purchases.map(p => ({
      id: `purchase-${p.id}`,
      date: p.createdAt,
      category: "Pembelian Barang",
      amount: Number(p.totalAmount),
      description: `Pembelian barang tunai (Inv: ${p.invoiceNumber}) - Pemasok: ${p.supplier.name}`,
      receiptPath: null,
      isSystemGenerated: true
    }));

    const mappedPayablePayments = payablePayments.map(pp => {
      const invNum = pp.payable.purchase?.invoiceNumber || pp.payable.reference || "Hutang";
      const supplierName = pp.payable.supplier.name;
      return {
        id: `payable-payment-${pp.id}`,
        date: pp.paymentDate,
        category: "Pembelian Barang",
        amount: Number(pp.amountPaid),
        description: `Bayar Hutang Supplier (Inv: ${invNum}) - Pemasok: ${supplierName}`,
        receiptPath: pp.attachment,
        isSystemGenerated: true
      };
    });

    // Combine all items
    let combined = [...mappedExpenses, ...mappedPurchases, ...mappedPayablePayments];

    // Sort combined by date descending
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate total
    const total = combined.length;

    // Apply pagination in memory
    let paginatedItems = combined;
    if (page && limit) {
      const skip = (page - 1) * limit;
      paginatedItems = combined.slice(skip, skip + limit);
    }

    return { items: paginatedItems, total };
  }

  static async create(data: {
    categoryId: string;
    amount: number;
    description?: string;
    date: string;
    receiptPath?: string;
  }) {
    if (!data.categoryId || !data.amount) {
      throw new ApiError(400, "Kategori dan jumlah wajib diisi");
    }

    return await prisma.expense.create({
      data: {
        categoryId: data.categoryId!,
        amount: Number(data.amount),
        description: data.description,
        date: new Date(data.date),
        receiptPath: data.receiptPath,
      },
    });
  }

  static async update(
    id: string,
    data: {
      categoryId?: string;
      amount?: number;
      description?: string;
      date?: string;
      receiptPath?: string;
    }
  ) {
    try {
      return await prisma.expense.update({
        where: { id },
        data: {
          ...(data.categoryId ? { categoryId: data.categoryId } : {}),
          amount: data.amount ? Number(data.amount) : undefined,
          description: data.description,
          date: data.date ? new Date(data.date) : undefined,
          ...(data.receiptPath !== undefined && { receiptPath: data.receiptPath }),
        },
      });
    } catch (error) {
      throw new ApiError(404, "Pengeluaran tidak ditemukan");
    }
  }

  static async delete(id: string) {
    try {
      await prisma.expense.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      throw new ApiError(404, "Pengeluaran tidak ditemukan");
    }
  }

  static async getSummary(startDate?: string, endDate?: string, search?: string, categoryId?: string) {
    const cacheKey = `${startDate || 'all'}_${endDate || 'all'}_${categoryId || 'all'}_${search || 'none'}`;
    const cached = summaryCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.data;
    }

    let expenseWhere: any = {};
    let purchaseWhere: any = { paymentStatus: "PAID", payables: { none: {} } };
    let payablePaymentWhere: any = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      expenseWhere.date = { gte: start, lte: end };
      purchaseWhere.createdAt = { gte: start, lte: end };
      payablePaymentWhere.paymentDate = { gte: start, lte: end };
    }

    if (search) {
      expenseWhere.OR = [
        { categoryRef: { name: { contains: search, mode: "insensitive" } } },
        { description: { contains: search, mode: "insensitive" } }
      ];
      
      purchaseWhere.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } }
      ];

      payablePaymentWhere.OR = [
        { payable: { reference: { contains: search, mode: "insensitive" } } },
        { payable: { purchase: { invoiceNumber: { contains: search, mode: "insensitive" } } } },
        { payable: { supplier: { name: { contains: search, mode: "insensitive" } } } }
      ];
    }

    if (categoryId) {
      if (categoryId === "PEMBELIAN_BARANG") {
        // Exclude normal expenses
        expenseWhere.id = { in: [] };
      } else {
        // Filter by specific category ID for normal expenses
        expenseWhere.categoryId = categoryId;
        // Exclude purchases and payables
        purchaseWhere.id = { in: [] };
        payablePaymentWhere.id = { in: [] };
      }
    }

    // Fetch counts and sums
    const [expenseStats, purchaseStats, payableStats, expenseReceiptCount, payableReceiptCount] = await Promise.all([
      prisma.expense.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
        _count: true
      }),
      prisma.purchase.aggregate({
        where: purchaseWhere,
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.payablePayment.aggregate({
        where: payablePaymentWhere,
        _sum: { amountPaid: true },
        _count: true
      }),
      prisma.expense.count({
        where: { ...expenseWhere, receiptPath: { not: null } }
      }),
      prisma.payablePayment.count({
        where: { ...payablePaymentWhere, attachment: { not: null } }
      })
    ]);

    const totalExpenseAmount = Number(expenseStats._sum.amount || 0);
    const totalPurchaseAmount = Number(purchaseStats._sum.totalAmount || 0);
    const totalPayableAmount = Number(payableStats._sum.amountPaid || 0);

    const totalExpense = totalExpenseAmount + totalPurchaseAmount + totalPayableAmount;
    const totalTransactions = (expenseStats._count || 0) + (purchaseStats._count || 0) + (payableStats._count || 0);

    // Group operational expenses by category
    const expenseCategories = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: expenseWhere,
      _sum: { amount: true }
    });

    const categories = await prisma.expenseCategory.findMany({
      where: { id: { in: expenseCategories.map(c => c.categoryId!).filter(Boolean) } }
    });
    
    const catIdToName = new Map(categories.map(c => [c.id, c.name]));

    const categoryMap: Record<string, number> = {};
    expenseCategories.forEach(c => {
      const catName = c.categoryId && catIdToName.has(c.categoryId) ? catIdToName.get(c.categoryId)! : "Uncategorized";
      categoryMap[catName] = Number(c._sum.amount || 0);
    });

    // Add Pembelian Barang as a category
    const totalPembelianBarang = totalPurchaseAmount + totalPayableAmount;
    if (totalPembelianBarang > 0) {
      categoryMap["Pembelian Barang"] = (categoryMap["Pembelian Barang"] || 0) + totalPembelianBarang;
    }

    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    const withReceiptCount = expenseReceiptCount + payableReceiptCount;

    const result = {
      totalExpense,
      totalTransactions,
      categoryData,
      withReceiptCount
    };

    summaryCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  }
}

