import prisma from "../config/db.ts";
import { ApiError } from "../utils/ApiError.ts";

const summaryCache = new Map<string, { data: any; timestamp: number }>();

export class SalesService {
  static async getAll(filters: { 
    customerId?: string; 
    projectId?: string; 
    paymentStatus?: string; 
    paymentMethod?: string;
    startDate?: string; 
    endDate?: string;
    page?: number;
    limit?: number;
    categoryId?: string;
    hasPending?: string;
    isDeliveryRequired?: string;
    search?: string;
  }) {
    const where: any = { deletedAt: null };
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.projectId) where.projectId = filters.projectId;
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
    if (filters.hasPending === 'true') {
      where.items = { ...where.items, some: { ...where.items?.some, pendingQuantity: { gt: 0 } } };
    }
    if (filters.isDeliveryRequired === 'true') {
      where.isDeliveryRequired = true;
    } else if (filters.isDeliveryRequired === 'false') {
      where.isDeliveryRequired = false;
    }
    if (filters.startDate && filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: new Date(filters.startDate), lte: end };
    }
    if (filters.search) {
      where.OR = [
        { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
        { customer: { name: { contains: filters.search, mode: "insensitive" } } }
      ];
    }

    const { page, limit } = filters;
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit ? Number(limit) : undefined;

    const [items, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: true,
          project: true,
          items: { 
            include: { 
              product: { include: { prices: true } }, 
              unit: true,
              batchAllocations: true 
            } 
          },
          debts: { include: { payments: true } },
          returns: { include: { items: true } },
          deliveries: { include: { items: true } }
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
    customerId: string;
    projectId?: string;
    userId?: string;
    items: any[];
    totalAmount: number;
    paymentMethod: string;
    dueDate?: string;
    transactionDate?: string;
    amountPaid?: number;
    changeAmount?: number;
    isDeliveryRequired?: boolean;
    splitPayments?: {
      cash?: number;
      debit?: number;
      transfer?: number;
      debt?: number;
    };
  }) {
    const { 
      customerId: rawCustomerId, 
      projectId: rawProjectId, 
      userId, 
      items, 
      totalAmount, 
      paymentMethod, 
      dueDate,
      transactionDate,
      amountPaid,
      changeAmount,
      splitPayments
    } = data;

    // Sanitize IDs
    // Sanitize IDs and verify User existence to prevent P2003 Foreign Key errors (e.g. after seed reset)
    const customerId = rawCustomerId || null;
    const projectId = rawProjectId || null;
    
    let finalUserId = null;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) finalUserId = userId;
    }

    // 1. Credit Limit Check for DEBT or split payment containing a DEBT component
    const isDebtPayment = paymentMethod === "DEBT";
    const splitDebtAmount = (paymentMethod === "SPLIT" && splitPayments) ? Number(splitPayments.debt || 0) : 0;

    if ((isDebtPayment || splitDebtAmount > 0) && customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          debts: {
            where: { status: { not: "PAID" } }
          }
        }
      });

      if (customer && customer.creditLimit) {
        const currentDebt = customer.debts.reduce((sum, d) => sum + Number(d.remainingBalance), 0);
        const addedDebt = isDebtPayment ? Number(totalAmount) : splitDebtAmount;
        if (currentDebt + addedDebt > Number(customer.creditLimit)) {
          throw new ApiError(400, `Limit kredit terlampaui. Hutang saat ini: Rp ${currentDebt.toLocaleString()}, Limit: Rp ${Number(customer.creditLimit).toLocaleString()}`);
        }
      }
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
    
    // Using random suffix if needed to prevent duplicate during concurrent, but sequential is better
    // For extreme concurrency safety, we could use retry logic, but for POS sequential count is usually safe enough.
    const sequence = (count + 1).toString().padStart(3, '0');
    const invoiceNumber = `INV-${dateStr}-${sequence}`;

    try {
      const sale = await prisma.$transaction(async (tx) => {
        // 2. Validate and Calculate totalAmount on backend for safety
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

        // Use backend calculation if frontend sent 0 or mismatch (optional, but safer to use backend as source of truth)
        const finalTotalAmount = (Number(totalAmount) > 0) ? Number(totalAmount) : calculatedTotal;

        if (finalTotalAmount <= 0 && items.length > 0) {
          throw new ApiError(400, "Total transaksi tidak boleh Rp 0. Periksa harga barang.");
        }

        // Formulate payment method value in case of split payment
        let dbPaymentMethod = paymentMethod || "CASH";
        if (paymentMethod === "SPLIT" && splitPayments) {
          const parts = [];
          if (Number(splitPayments.cash || 0) > 0) parts.push(`CASH=${Number(splitPayments.cash)}`);
          if (Number(splitPayments.debit || 0) > 0) parts.push(`DEBIT=${Number(splitPayments.debit)}`);
          if (Number(splitPayments.transfer || 0) > 0) parts.push(`TRANSFER=${Number(splitPayments.transfer)}`);
          if (Number(splitPayments.debt || 0) > 0) parts.push(`DEBT=${Number(splitPayments.debt)}`);
          dbPaymentMethod = `SPLIT:${parts.join(";")}`;
        }

        const newSale = await tx.sale.create({
          data: {
            invoiceNumber,
            customerId,
            projectId,
            userId: finalUserId,
            totalAmount: finalTotalAmount,
            paymentStatus: (paymentMethod === "DEBT" || (paymentMethod === "SPLIT" && splitDebtAmount > 0)) ? "PIUTANG" : "LUNAS",
            paymentMethod: dbPaymentMethod,
            amountPaid: amountPaid != null ? Number(amountPaid) : null,
            changeAmount: changeAmount != null ? Number(changeAmount) : null,
            isDeliveryRequired: data.isDeliveryRequired === true,
            createdAt: transactionDate ? today : undefined,
          } as any
        });

        // 3. Stock Management (FIFO Logic)
        for (const item of items) {
          const productId = item.productId || item.id;
          // Fetch product and price info
          const product = await tx.product.findUnique({ 
            where: { id: productId },
            include: { prices: true }
          });
          if (!product) throw new ApiError(404, `Produk ${productId} tidak ditemukan.`);

          // Find conversion factor for the selected unit
          const selectedUnitId = item.unitId || product.prices?.[0]?.unitId;
          const productPrice = product.prices.find(p => p.unitId === selectedUnitId);
          const conversionFactor = productPrice?.conversionFactor || 1;
          
          const totalQuantity = Number(item.quantity) || 0;
          const deliveredQuantity = item.takenQuantity !== undefined ? Number(item.takenQuantity) : totalQuantity;
          const pendingQuantity = totalQuantity - deliveredQuantity;
          
          const baseQuantityToDeduct = deliveredQuantity * conversionFactor;
          let remainingToDeduct = baseQuantityToDeduct;

          if (product.stock < baseQuantityToDeduct) {
            throw new ApiError(400, `Stok tidak mencukupi untuk ${product.name}. Tersedia: ${product.stock}, Diminta (diambil): ${baseQuantityToDeduct} (dalam satuan terkecil)`);
          }

          // Fetch active batches
          let batches;
          if (item.batchId) {
            // Priority for scanned batch
            const scannedBatch = await tx.stockBatch.findUnique({ 
              where: { id: item.batchId, currentQuantity: { gt: 0 } } 
            });
            const otherBatches = await tx.stockBatch.findMany({
              where: { productId, id: { not: item.batchId }, currentQuantity: { gt: 0 } },
              orderBy: { createdAt: "asc" }
            });
            batches = scannedBatch ? [scannedBatch, ...otherBatches] : otherBatches;
          } else {
            // Standard FIFO
            batches = await tx.stockBatch.findMany({
              where: { productId, currentQuantity: { gt: 0 } },
              orderBy: { createdAt: "asc" }
            });
          }

          // Create SaleItem with fallbacks for unit and price
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
              deliveredQuantity: deliveredQuantity,
              pendingQuantity: pendingQuantity,
              priceAtSale: priceAtSale,
              isManualPrice: isManualPrice,
              isBonus: item.isBonus || false
            } as any
          });

          if (baseQuantityToDeduct > 0) {

            for (const batch of batches) {
              if (remainingToDeduct <= 0) break;

              const deduction = Math.min(batch.currentQuantity, remainingToDeduct);
              
              // 1. Update batch sisa stok
              await tx.stockBatch.update({
                where: { id: batch.id },
                data: { currentQuantity: { decrement: deduction } }
              });

              // 2. Catat alokasi batch (untuk hitung laba real & return)
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

            // 3. Update Product cached stock
            await tx.product.update({
              where: { id: productId },
              data: { stock: { decrement: baseQuantityToDeduct } }
            });

            // 4. Create StockLog
            await tx.stockLog.create({
              data: {
                productId,
                type: "OUT",
                quantity: baseQuantityToDeduct,
                reason: `Penjualan ${newSale.invoiceNumber}`,
                createdAt: transactionDate ? today : undefined,
              }
            });
          }
        }

        // 4. Debt Creation for DEBT or split payment containing a DEBT component
        if (paymentMethod === "DEBT" || (paymentMethod === "SPLIT" && splitDebtAmount > 0)) {
          let finalDueDate = new Date();
          finalDueDate.setDate(finalDueDate.getDate() + 30); // Default 30 days
          if (dueDate) finalDueDate = new Date(dueDate);

          const debtAmount = paymentMethod === "SPLIT" ? splitDebtAmount : finalTotalAmount;

          await tx.debt.create({
            data: {
              saleId: newSale.id,
              customerId,
              amountDue: debtAmount,
              remainingBalance: debtAmount,
              dueDate: finalDueDate,
              status: "UNPAID",
              createdAt: transactionDate ? today : undefined,
            }
          });
        }



        return newSale;
      });

      // 6. Audit Logging (Outside transaction)
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
    const { items: sales, total, page, limit } = await this.getAll(filters);
    
    const processedItems = sales.map(sale => {
      // Maps to track quantities in deliveries
      const deliveredDoMap = new Map<string, number>();
      const lockedDoMap = new Map<string, number>();
      
      sale.deliveries.forEach(delivery => {
        if (delivery.status === "DELIVERED") {
          delivery.items.forEach(dItem => {
            const current = deliveredDoMap.get(dItem.productId) || 0;
            deliveredDoMap.set(dItem.productId, current + dItem.quantity);
          });
        } else if (delivery.status === "PENDING" || delivery.status === "ON_DELIVERY") {
          delivery.items.forEach(dItem => {
            const current = lockedDoMap.get(dItem.productId) || 0;
            lockedDoMap.set(dItem.productId, current + dItem.quantity);
          });
        }
      });

      const itemsWithStatus = sale.items.map(item => {
        const deliveredDoQty = deliveredDoMap.get(item.productId) || 0;
        const lockedDoQty = lockedDoMap.get(item.productId) || 0;
        
        const ambilQty = Math.max(0, (item.deliveredQuantity || 0) - deliveredDoQty);
        const terkirimQty = deliveredDoQty + lockedDoQty;
        const sisaQty = Math.max(0, item.quantity - ambilQty - terkirimQty);
        
        // effectiveDeliveredQty is still needed for deliveryStatus calculation
        const effectiveDeliveredQty = ambilQty + terkirimQty;
        
        return {
          ...item,
          deliveredQuantity: effectiveDeliveredQty,
          remainingQuantity: sisaQty,
          pickedUpQuantity: ambilQty,
          inDeliveryQuantity: terkirimQty
        };
      });

      const isFullyDelivered = itemsWithStatus.every(item => item.remainingQuantity <= 0);
      const isPartiallyDelivered = itemsWithStatus.some(item => (item.deliveredQuantity || 0) > 0);

      const totalDiscount = sale.debts?.reduce((sum, d) => sum + d.payments.reduce((s, p) => s + Number(p.discount || 0), 0), 0) || 0;
      const adjustedTotalAmount = Number(sale.totalAmount) - totalDiscount;

      return {
        ...sale,
        totalAmount: adjustedTotalAmount,
        items: itemsWithStatus,
        deliveryStatus: isFullyDelivered ? "FULL" : (isPartiallyDelivered ? "PARTIAL" : "NONE")
      };
    });

    return { items: processedItems, total, page, limit };
  }

  static async getSummary(filters: { 
    startDate?: string; 
    endDate?: string; 
    customerId?: string; 
    projectId?: string;
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
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.projectId) where.projectId = filters.projectId;
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

    // 1. Basic Stats
    const stats = await prisma.sale.aggregate({
      where,
      _sum: { totalAmount: true },
      _count: true,
    });

    const returnWhere: any = {};
    const saleFiltersForReturn: any = { deletedAt: null };
    let hasSaleFilter = false;

    if (filters.customerId) {
      returnWhere.customerId = filters.customerId;
      hasSaleFilter = true;
    }
    if (filters.projectId) {
      saleFiltersForReturn.projectId = filters.projectId;
      hasSaleFilter = true;
    }
    if (filters.paymentStatus) {
      saleFiltersForReturn.paymentStatus = filters.paymentStatus;
      hasSaleFilter = true;
    }
    if (filters.paymentMethod) {
      hasSaleFilter = true;
      if (filters.paymentMethod === 'SPLIT') {
        saleFiltersForReturn.paymentMethod = { startsWith: 'SPLIT' };
      } else {
        saleFiltersForReturn.paymentMethod = { contains: filters.paymentMethod };
      }
    }

    if (hasSaleFilter) {
      returnWhere.sale = saleFiltersForReturn;
    } else {
      returnWhere.OR = [{ saleId: null }, { sale: { deletedAt: null } }];
    }

    if (filters.startDate && filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      returnWhere.createdAt = { gte: new Date(filters.startDate), lte: end };
    }
    
    if (filters.categoryId) {
      returnWhere.items = { some: { product: { categoryId: filters.categoryId } } };
    }

    const returnsData = await prisma.return.findMany({
      where: returnWhere,
      select: {
        createdAt: true,
        totalAmount: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            price: true,
            product: {
              select: {
                id: true,
                code: true,
                name: true,
                categoryId: true,
                category: { select: { name: true } },
                averageCost: true,
                prices: {
                  select: { unitId: true, price: true, conversionFactor: true, unit: { select: { name: true } } }
                }
              }
            }
          }
        },
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
        }
      }
    });

    // 2. Payment Method Breakdown
    const paymentMethods = await prisma.sale.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { totalAmount: true }
    });

    // 3. Trend Data & Cost Calculation
    const salesData = await prisma.sale.findMany({
      where,
      select: {
        createdAt: true,
        totalAmount: true,
        paymentMethod: true,
        debts: {
          select: {
            payments: {
              select: { discount: true }
            }
          }
        },
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
                averageCost: true, // Fallback
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
    let totalDiscountSum = 0;
    const paymentMethodsMap: Record<string, number> = {};

    salesData.forEach(sale => {
      let totalDiscount = 0;
      if (sale.debts) {
        totalDiscount = sale.debts.reduce((sum, d) => sum + d.payments.reduce((s, p) => s + Number(p.discount || 0), 0), 0);
      }
      totalDiscountSum += totalDiscount;
      const revenue = Number(sale.totalAmount) - totalDiscount;
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

        // FIFO Cost Calculation: Sum from batch allocations
        let itemCost = 0;
        if (item.batchAllocations && item.batchAllocations.length > 0) {
          itemCost = item.batchAllocations.reduce((sum, b) => sum + (Number(b.costPrice) * b.quantity), 0);
        } else {
          // Fallback for old data or edge cases
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

    let totalReturnTotal = 0;
    let totalReturnCost = 0;

    returnsData.forEach(ret => {
      const returnRevenue = Number(ret.totalAmount);
      const dateStr = new Date(ret.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      
      if (!trendMap[dateStr]) trendMap[dateStr] = { date: dateStr, revenue: 0, profit: 0 };
      trendMap[dateStr].revenue -= returnRevenue;
      
      let returnCost = 0;
      ret.items.forEach(item => {
        const product = item.product;
        const prodId = product?.id || "unknown";
        
        let qtyInBaseUnits = item.quantity;
        let itemCost = qtyInBaseUnits * Number(product?.averageCost || 0); // fallback

        if (ret.sale && ret.sale.items) {
          const saleItem = ret.sale.items.find((si: any) => si.productId === item.productId);
          if (saleItem) {
            let totalSaleCost = 0;
            if (saleItem.batchAllocations && saleItem.batchAllocations.length > 0) {
              totalSaleCost = saleItem.batchAllocations.reduce((bSum: number, b: any) => bSum + (Number(b.costPrice) * b.quantity), 0);
              const totalBaseQty = saleItem.batchAllocations.reduce((bSum: number, b: any) => bSum + b.quantity, 0);
              const ratio = totalBaseQty / saleItem.quantity;
              qtyInBaseUnits = item.quantity * ratio;
            } else {
              totalSaleCost = saleItem.quantity * Number(product?.averageCost || 0);
            }
            if (saleItem.quantity > 0) {
              const costPerSaleUnit = totalSaleCost / saleItem.quantity;
              itemCost = item.quantity * costPerSaleUnit;
            }
          }
        }

        returnCost += itemCost;
        
        const itemRevenue = Number(item.price) * item.quantity;
        
        if (productSales[prodId]) {
          productSales[prodId].qty -= qtyInBaseUnits;
          productSales[prodId].revenue -= itemRevenue;
          productSales[prodId].cost -= itemCost;
          productSales[prodId].profit -= (itemRevenue - itemCost);
        }
      });
      
      trendMap[dateStr].profit -= (returnRevenue - returnCost);
      totalReturnTotal += returnRevenue;
      totalReturnCost += returnCost;
    });

    const totalRevenue = totalRevenueFromSales - totalReturnTotal;
    const totalTransactions = stats._count || 0;
    const grossProfit = totalRevenue - (totalCost - totalReturnCost);
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const topProducts = Object.values(productSales)
      .map(p => ({ name: p.name, qty: p.qty, revenue: p.revenue }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const allProductsProfit = Object.values(productSales)
      .sort((a, b) => b.profit - a.profit);

    const trendData = Object.values(trendMap);
    const paymentData = Object.entries(paymentMethodsMap).map(([name, value]) => ({
      name,
      value
    }));

    const result = {
      totalRevenue,
      grossProfit,
      totalTransactions,
      averageTransaction,
      topProducts,
      allProductsProfit,
      trendData,
      paymentData,
      totalBonusQty,
      totalBonusCost,
      totalBonusValue,
      totalReturnTotal,
      totalDiscount: totalDiscountSum
    };

    summaryCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }

  static async fulfillPendingItems(saleId: string, itemsToTake: { saleItemId: string, takenQuantity: number }[], userId?: string, customReason?: string) {
    return await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: { include: { product: { include: { prices: true } } } } }
      });

      if (!sale) throw new ApiError(404, "Penjualan tidak ditemukan.");

      const today = new Date();

      for (const reqItem of itemsToTake) {
        if (reqItem.takenQuantity <= 0) continue;

        const saleItem = sale.items.find(i => i.id === reqItem.saleItemId);
        if (!saleItem) throw new ApiError(404, `Item ${reqItem.saleItemId} tidak ditemukan dalam penjualan ini.`);
        
        if (saleItem.pendingQuantity < reqItem.takenQuantity) {
          throw new ApiError(400, `Jumlah yang diambil melebihi jumlah titipan (Sisa: ${saleItem.pendingQuantity}).`);
        }

        const product = saleItem.product;
        const productPrice = product.prices.find(p => p.unitId === saleItem.unitId) || product.prices[0];
        const conversionFactor = productPrice?.conversionFactor || 1;

        const baseQuantityToDeduct = reqItem.takenQuantity * conversionFactor;
        let remainingToDeduct = baseQuantityToDeduct;

        if (product.stock < baseQuantityToDeduct) {
          throw new ApiError(400, `Stok tidak mencukupi untuk ${product.name}. Tersedia: ${product.stock}, Diminta: ${baseQuantityToDeduct} (dalam satuan terkecil)`);
        }

        const batches = await tx.stockBatch.findMany({
          where: { productId: product.id, currentQuantity: { gt: 0 } },
          orderBy: { createdAt: "asc" }
        });

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
          throw new ApiError(400, `Gagal memproses FIFO untuk ${product.name}. Stok fisik mungkin kurang.`);
        }

        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: baseQuantityToDeduct } }
        });

        await tx.stockLog.create({
          data: {
            productId: product.id,
            type: "OUT",
            quantity: baseQuantityToDeduct,
            reason: customReason || `Ambil Barang Titipan dari INV ${sale.invoiceNumber}`,
            createdAt: today
          }
        });

        // Update SaleItem delivered and pending quantities
        await tx.saleItem.update({
          where: { id: saleItem.id },
          data: {
            deliveredQuantity: { increment: reqItem.takenQuantity },
            pendingQuantity: { decrement: reqItem.takenQuantity }
          }
        });
      }

      if (userId) {
        try {
          const { AuditService } = await import("./AuditService.ts");
          await AuditService.log({
            userId,
            action: "UPDATE_SALE",
            entity: "Sale",
            entityId: saleId,
            details: { action: "fulfill_pending_items", itemCount: itemsToTake.length }
          });
        } catch (e) {
          console.error("Audit log error on fulfill pending items", e);
        }
      }

      return { success: true, message: "Pengambilan barang berhasil dicatat." };
    });
  }

  static async softDelete(id: string, userId?: string) {
    return await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { 
          items: {
            include: { batchAllocations: true }
          },
          debts: true,
          returns: {
            include: { items: true }
          }
        }
      });
      
      if (!sale) throw new ApiError(404, "Transaksi tidak ditemukan");
      if (sale.deletedAt) throw new ApiError(400, "Transaksi sudah dihapus");

      const today = new Date();

      // Calculate how much base qty was already returned in GOOD condition
      const returnedBaseQtyPerProduct = new Map<string, number>();
      for (const ret of sale.returns || []) {
        for (const retItem of ret.items) {
          if (retItem.condition === "GOOD") {
            const saleItem = sale.items.find(i => i.productId === retItem.productId);
            if (saleItem) {
              const totalBaseQty = saleItem.batchAllocations.reduce((sum, b) => sum + b.quantity, 0);
              const ratio = totalBaseQty / saleItem.quantity;
              const actualBaseQty = Number(retItem.quantity) * ratio;
              const current = returnedBaseQtyPerProduct.get(retItem.productId) || 0;
              returnedBaseQtyPerProduct.set(retItem.productId, current + actualBaseQty);
            }
          }
        }
      }

      // 1. Kembalikan stok dari alokasi batch (hanya yang belum diretur)
      for (const item of sale.items) {
        const totalAllocated = item.batchAllocations.reduce((sum, alloc) => sum + alloc.quantity, 0);
        const alreadyReturnedQty = returnedBaseQtyPerProduct.get(item.productId) || 0;
        
        let remainingToRestore = Math.max(0, totalAllocated - alreadyReturnedQty);
        let actuallyRestored = 0;

        for (const alloc of item.batchAllocations) {
          if (alloc.quantity > 0 && remainingToRestore > 0) {
            const restoreAmt = Math.min(alloc.quantity, remainingToRestore);
            await tx.stockBatch.update({
              where: { id: alloc.batchId },
              data: { currentQuantity: { increment: restoreAmt } }
            });
            remainingToRestore -= restoreAmt;
            actuallyRestored += restoreAmt;
          }
        }

        if (actuallyRestored > 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: actuallyRestored } }
          });

          await tx.stockLog.create({
            data: {
              productId: item.productId,
              type: "IN",
              quantity: actuallyRestored,
              reason: `Pembatalan Penjualan ${sale.invoiceNumber} (Net setelah Retur)`,
              createdAt: today
            }
          });
        }
      }

      // 2. Soft delete penjualan
      const deletedSale = await tx.sale.update({
        where: { id },
        data: { deletedAt: today }
      });

      // 3. Soft delete piutang terkait jika ada
      for (const debt of sale.debts) {
        if (!debt.deletedAt) {
          await tx.debt.update({
            where: { id: debt.id },
            data: { deletedAt: today }
          });
        }
      }

      // 4. Audit Log
      if (userId) {
        try {
          const { AuditService } = await import("./AuditService.ts");
          await AuditService.log({
            userId,
            action: "DELETE_SALE",
            entity: "Sale",
            entityId: sale.id,
            details: JSON.stringify({ invoiceNumber: sale.invoiceNumber, action: "soft_delete", stockReturned: true })
          });
        } catch (e) {
          console.error("Audit log error on delete sale", e);
        }
      }

      return deletedSale;
    });
  }
}

