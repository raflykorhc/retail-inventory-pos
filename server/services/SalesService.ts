import prisma from "../config/db.ts";
import { ApiError } from "../utils/ApiError.ts";

const summaryCache = new Map<string, { data: any; timestamp: number }>();

export class SalesService {
  static async getAll(filters: { 
    paymentStatus?: string; 
    paymentMethod?: string;
    startDate?: string; 
    endDate?: string;
    page?: number;
    limit?: number;
    categoryId?: string;
    search?: string;
  }) {
    const where: any = { deletedAt: null };
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.paymentMethod) {
      if (filters.paymentMethod === 'SPLIT') {
        where.paymentMethod = { startsWith: 'SPLIT' };
      } else {
        where.paymentMethod = { contains: filters.paymentMethod };
      }
    }
    if (filters.categoryId) {
      where.items = { ...where.items, some: { ...where.items?.some, product: { categoryId: filters.categoryId } } };
    }
    if (filters.startDate && filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: new Date(filters.startDate), lte: end };
    }
    if (filters.search) {
      where.OR = [
        { invoiceNumber: { contains: filters.search, mode: "insensitive" } }
      ];
    }

    const { page, limit } = filters;
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit ? Number(limit) : undefined;

    const [items, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: { 
            include: { 
              product: { include: { prices: true } }, 
              unit: true,
              batchAllocations: true 
            } 
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take
      }),
      prisma.sale.count({ where })
    ]);

    return { items, total, page: page || 1, limit: limit || total };
  }

  static async create(data: {
    userId?: string;
    items: any[];
    totalAmount: number;
    paymentMethod: string;
    transactionDate?: string;
    amountPaid?: number;
    changeAmount?: number;
    splitPayments?: {
      cash?: number;
      debit?: number;
      transfer?: number;
    };
  }) {
    const { 
      userId, 
      items, 
      totalAmount, 
      paymentMethod, 
      transactionDate,
      amountPaid,
      changeAmount,
      splitPayments
    } = data;

    let finalUserId = null;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) finalUserId = userId;
    }

    let today = new Date();
    if (transactionDate) {
      const parts = transactionDate.split('T')[0].split('-');
      if (parts.length === 3) {
        today.setFullYear(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
    }
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    const count = await prisma.sale.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay }
      }
    });
    
    const sequence = (count + 1).toString().padStart(3, '0');
    const invoiceNumber = `INV-${dateStr}-${sequence}`;

    try {
      const sale = await prisma.$transaction(async (tx) => {
        let calculatedTotal = 0;
        for (const item of items) {
          const productId = item.productId || item.id;
          const product = await tx.product.findUnique({ 
            where: { id: productId },
            include: { prices: true }
          });
          
          const priceAtSale = item.isBonus ? 0 : Number(item.price ?? item.sellingPrice ?? 
            product?.prices?.find((p: any) => p.unitId === (item.unitId || product.prices?.[0]?.unitId))?.price ??
            product?.prices?.reduce((min: any, p: any) => (!min || p.conversionFactor < min.conversionFactor ? p : min), null)?.price ??
            0
          );
          calculatedTotal += priceAtSale * (Number(item.quantity) || 0);
        }

        const finalTotalAmount = (Number(totalAmount) > 0) ? Number(totalAmount) : calculatedTotal;

        if (finalTotalAmount <= 0 && items.length > 0) {
          throw new ApiError(400, "Total transaksi tidak boleh Rp 0. Periksa harga barang.");
        }

        let dbPaymentMethod = paymentMethod || "CASH";
        if (paymentMethod === "SPLIT" && splitPayments) {
          const parts = [];
          if (Number(splitPayments.cash || 0) > 0) parts.push(`CASH=${splitPayments.cash}`);
          if (Number(splitPayments.debit || 0) > 0) parts.push(`DEBIT=${splitPayments.debit}`);
          if (Number(splitPayments.transfer || 0) > 0) parts.push(`TRANSFER=${splitPayments.transfer}`);
          dbPaymentMethod = `SPLIT:${parts.join(",")}`;
        }

        const newSale = await tx.sale.create({
          data: {
            invoiceNumber,
            userId: finalUserId,
            totalAmount: finalTotalAmount,
            paymentStatus: "LUNAS",
            paymentMethod: dbPaymentMethod,
            amountPaid: amountPaid != null ? Number(amountPaid) : null,
            changeAmount: changeAmount != null ? Number(changeAmount) : null,
            createdAt: transactionDate ? today : undefined,
          } as any
        });

        for (const item of items) {
          const productId = item.productId || item.id;
          const product = await tx.product.findUnique({ 
            where: { id: productId },
            include: { prices: true }
          });
          if (!product) throw new ApiError(404, `Produk ${item.name || productId} tidak ditemukan.`);

          const selectedUnitId = item.unitId || product.prices?.[0]?.unitId;
          const productPrice = product.prices.find(p => p.unitId === selectedUnitId);
          const conversionFactor = productPrice?.conversionFactor || 1;
          
          const totalQuantity = Number(item.quantity) || 0;
          const baseQuantityToDeduct = totalQuantity * conversionFactor;
          let remainingToDeduct = baseQuantityToDeduct;

          if (product.stock < baseQuantityToDeduct) {
            throw new ApiError(400, `Stok tidak mencukupi untuk ${product.name}. Tersedia: ${product.stock}, Diminta: ${baseQuantityToDeduct}`);
          }

          let batches;
          if (item.batchId) {
            const scannedBatch = await tx.stockBatch.findUnique({ 
              where: { id: item.batchId, currentQuantity: { gt: 0 } } 
            });
            const otherBatches = await tx.stockBatch.findMany({
              where: { productId, id: { not: item.batchId }, currentQuantity: { gt: 0 } },
              orderBy: { createdAt: "asc" }
            });
            batches = scannedBatch ? [scannedBatch, ...otherBatches] : otherBatches;
          } else {
            batches = await tx.stockBatch.findMany({
              where: { productId, currentQuantity: { gt: 0 } },
              orderBy: { createdAt: "asc" }
            });
          }

          const unitId = selectedUnitId;
          const standardPrice = Number(productPrice?.price || 0);
          const priceAtSale = item.isBonus ? 0 : Number(item.price ?? item.sellingPrice ?? standardPrice);
          const isManualPrice = item.isBonus ? false : Math.abs(priceAtSale - standardPrice) > 0.01;

          if (!unitId) {
            throw new ApiError(400, `Produk ${product.name} tidak memiliki satuan yang valid.`);
          }

          const saleItem = await tx.saleItem.create({
            data: {
              saleId: newSale.id,
              productId,
              unitId,
              quantity: totalQuantity,
              priceAtSale: priceAtSale,
              isManualPrice: isManualPrice,
              isBonus: item.isBonus || false
            } as any
          });

          if (baseQuantityToDeduct > 0) {
            for (const batch of batches) {
              if (remainingToDeduct <= 0) break;

              const deduction = Math.min(batch.currentQuantity, remainingToDeduct);
              
              await tx.stockBatch.update({
                where: { id: batch.id },
                data: { currentQuantity: { decrement: deduction } }
              });

              await tx.saleItemBatch.create({
                data: {
                  saleItemId: saleItem.id,
                  batchId: batch.id,
                  quantity: deduction,
                  costPrice: batch.costPrice
                }
              });

              remainingToDeduct -= deduction;
            }

            if (remainingToDeduct > 0) {
              throw new ApiError(400, `Gagal memproses FIFO untuk ${product.name}. Kemungkinan data batch tidak sinkron.`);
            }

            await tx.product.update({
              where: { id: productId },
              data: { stock: { decrement: baseQuantityToDeduct } }
            });

            await tx.stockLog.create({
              data: {
                productId,
                type: "OUT",
                quantity: baseQuantityToDeduct,
                reason: `Penjualan ${invoiceNumber}`,
                createdAt: transactionDate ? today : undefined,
              }
            });
          }
        }

        return newSale;
      });

      if (userId) {
        try {
          const { AuditService } = await import("./AuditService.ts");
          await AuditService.log({
            userId,
            action: "CREATE_SALE",
            entity: "Sale",
            entityId: sale.id,
            details: { invoiceNumber: sale.invoiceNumber, totalAmount: Number(sale.totalAmount) }
          });
        } catch (auditError) {
          console.error("Non-blocking Audit Log Error:", auditError);
        }
      }

      return sale;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Sale Creation Failure:", error);
      throw error;
    }
  }

  static async getReport(filters: any) {
    return this.getAll(filters);
  }

  static async getSummary(filters: { 
    startDate?: string; 
    endDate?: string; 
    paymentStatus?: string;
    paymentMethod?: string;
    categoryId?: string;
  }) {
    const cacheKey = JSON.stringify(filters);
    const cached = summaryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }

    const where: any = { deletedAt: null };
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.paymentMethod) {
      if (filters.paymentMethod === 'SPLIT') {
        where.paymentMethod = { startsWith: 'SPLIT' };
      } else {
        where.paymentMethod = { contains: filters.paymentMethod };
      }
    }
    if (filters.startDate && filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: new Date(filters.startDate), lte: end };
    }
    if (filters.categoryId) {
      where.items = { some: { product: { categoryId: filters.categoryId } } };
    }

    const stats = await prisma.sale.aggregate({
      where,
      _sum: { totalAmount: true },
      _count: true,
    });

    const paymentMethods = await prisma.sale.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { totalAmount: true }
    });

    const salesData = await prisma.sale.findMany({
      where,
      select: {
        createdAt: true,
        totalAmount: true,
        paymentMethod: true,
        items: {
          select: {
            quantity: true,
            priceAtSale: true,
            isBonus: true,
            unitId: true,
            product: {
              select: {
                id: true,
                code: true,
                name: true,
                categoryId: true,
                category: {
                  select: { name: true }
                },
                averageCost: true,
                prices: {
                  select: {
                    unitId: true,
                    price: true,
                    conversionFactor: true,
                    unit: {
                      select: { name: true }
                    }
                  }
                }
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
      },
      orderBy: { createdAt: 'asc' }
    });

    let totalCost = 0;
    let totalBonusQty = 0;
    let totalBonusCost = 0;
    let totalBonusValue = 0;
    const productSales: Record<string, { 
      id: string, 
      code: string, 
      name: string, 
      category: string,
      qty: number, 
      revenue: number,
      cost: number,
      profit: number,
      prices: any[]
    }> = {};
    const trendMap: Record<string, { date: string, revenue: number, profit: number }> = {};

    let totalRevenueFromSales = 0;
    const paymentMethodsMap: Record<string, number> = {};

    salesData.forEach(sale => {
      const revenue = Number(sale.totalAmount);
      totalRevenueFromSales += revenue;
      
      const method = sale.paymentMethod || "CASH";
      if (!paymentMethodsMap[method]) paymentMethodsMap[method] = 0;
      paymentMethodsMap[method] += revenue;
      
      const dateStr = new Date(sale.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      
      if (!trendMap[dateStr]) trendMap[dateStr] = { date: dateStr, revenue: 0, profit: 0 };
      trendMap[dateStr].revenue += revenue;

      let saleCost = 0;
      sale.items.forEach(item => {
        const product = item.product;
        const prodId = product?.id || "unknown";
        const prodName = product?.name || "Unknown";
        const prodCode = product?.code || "-";
        const catName = product?.category?.name || "Umum";

        const productPrice = product?.prices?.find((p: any) => p.unitId === item.unitId);
        const conversionFactor = productPrice?.conversionFactor || 1;
        const qtyInBaseUnits = item.quantity * conversionFactor;

        let itemCost = 0;
        if (item.batchAllocations && item.batchAllocations.length > 0) {
          itemCost = item.batchAllocations.reduce((sum, b) => sum + (Number(b.costPrice) * b.quantity), 0);
        } else {
          itemCost = Number(product?.averageCost || 0) * qtyInBaseUnits;
        }

        saleCost += itemCost;
        totalCost += itemCost;

        const itemRevenue = item.isBonus ? 0 : (Number(item.priceAtSale) * item.quantity);

        if (item.isBonus) {
          totalBonusQty += item.quantity;
          totalBonusCost += itemCost;
          const standardPrice = Number(product?.prices?.find((p: any) => p.unitId === item.unitId)?.price || 0);
          totalBonusValue += (standardPrice * item.quantity);
        }

        if (!productSales[prodId]) {
          productSales[prodId] = {
            id: prodId,
            code: prodCode,
            name: prodName,
            category: catName,
            qty: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            prices: product?.prices || []
          };
        }
        productSales[prodId].qty += qtyInBaseUnits;
        productSales[prodId].revenue += itemRevenue;
        productSales[prodId].cost += itemCost;
        productSales[prodId].profit += (itemRevenue - itemCost);
      });

      trendMap[dateStr].profit += (revenue - saleCost);
    });

    const totalRevenue = totalRevenueFromSales;
    const totalTransactions = stats._count || 0;
    const grossProfit = totalRevenue - totalCost;
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const topProducts = Object.values(productSales)
      .map(p => ({ name: p.name, qty: p.qty, revenue: p.revenue }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const allProductsProfit = Object.values(productSales)
      .sort((a, b) => b.profit - a.profit);

    const formattedPaymentMethods = Object.entries(paymentMethodsMap).map(([method, amount]) => {
      let displayName = method;
      if (method.startsWith("SPLIT:")) displayName = "SPLIT";
      return { method: displayName, amount };
    });

    const data = {
      totalRevenue,
      totalTransactions,
      grossProfit,
      averageTransaction,
      totalCost,
      totalBonusQty,
      totalBonusCost,
      totalBonusValue,
      paymentMethods: formattedPaymentMethods,
      topProducts,
      productProfits: allProductsProfit,
      trend: Object.values(trendMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    };

    summaryCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  static async getById(id: string) {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: true, unit: true } }
      }
    });
    if (!sale || sale.deletedAt) throw new ApiError(404, "Transaksi tidak ditemukan");
    return sale;
  }

  static async delete(id: string, userId?: string) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: { include: { product: { include: { prices: true } }, batchAllocations: true } } }
      });
      if (!sale || sale.deletedAt) throw new ApiError(404, "Transaksi tidak ditemukan");

      for (const item of sale.items) {
        const productPrice = item.product.prices.find(p => p.unitId === item.unitId);
        const conversionFactor = productPrice?.conversionFactor || 1;
        const baseQuantityToRestore = item.quantity * conversionFactor;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: baseQuantityToRestore } }
        });

        for (const alloc of item.batchAllocations) {
          await tx.stockBatch.update({
            where: { id: alloc.batchId },
            data: { currentQuantity: { increment: alloc.quantity } }
          });
        }

        await tx.stockLog.create({
          data: {
            productId: item.productId,
            type: "IN",
            quantity: baseQuantityToRestore,
            reason: `Pembatalan Penjualan ${sale.invoiceNumber}`,
          }
        });
      }

      const updatedSale = await tx.sale.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      if (userId) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "DELETE_SALE",
          entity: "Sale",
          entityId: sale.id,
          details: { invoiceNumber: sale.invoiceNumber, reason: "Manual Cancellation" }
        });
      }

      return updatedSale;
    });
  }

  static clearCache() {
    summaryCache.clear();
  }
}
