import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const summaryCache = new Map<string, { data: any; timestamp: number }>();

export const getPurchases = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, supplierId, page, limit } = req.query;

    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    if (supplierId) {
      where.supplierId = supplierId;
    }

    const skip = page && limit ? (Number(page) - 1) * Number(limit) : undefined;
    const take = limit ? Number(limit) : undefined;

    const [items, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
              unit: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take
      }),
      prisma.purchase.count({ where })
    ]);

    res.json({ items, total });
  } catch (error) {
    console.error("Get Purchases Error:", error);
    res.status(500).json({ error: "Failed to get purchases" });
  }
};

export const getPurchaseSummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, supplierId } = req.query;
    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    if (supplierId) where.supplierId = supplierId;

    const cacheKey = JSON.stringify({ startDate, endDate, supplierId });
    const cached = summaryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return res.json(cached.data);
    }

    const stats = await prisma.purchase.aggregate({
      where,
      _sum: { totalAmount: true },
      _count: true
    });

    const suppliers = await prisma.purchase.groupBy({
      by: ['supplierId'],
      where,
      _sum: { totalAmount: true }
    });

    // Get supplier names for the breakdown
    const supplierIds = suppliers.map(s => s.supplierId).filter(id => id !== null) as string[];
    const supplierNames = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, name: true }
    });

    const supplierMap = new Map(supplierNames.map(s => [s.id, s.name]));

    const supplierData = suppliers.map(s => ({
      name: s.supplierId ? (supplierMap.get(s.supplierId) || "Unknown") : "Tanpa Pemasok",
      value: Number(s._sum.totalAmount || 0)
    })).sort((a, b) => b.value - a.value);

    const result = {
      totalPurchase: Number(stats._sum.totalAmount || 0),
      totalTransactions: stats._count || 0,
      supplierData
    };

    summaryCache.set(cacheKey, { data: result, timestamp: Date.now() });
    res.json(result);
  } catch (error) {
    console.error("Get Purchase Summary Error:", error);
    res.status(500).json({ error: "Failed to get purchase summary" });
  }
};

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const { invoiceNumber, supplierId, totalAmount, paymentStatus, paymentMethod, items, amountPaid, transactionDate, dueDate } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      let finalCreatedAt: Date | undefined;
      if (transactionDate) {
        if (typeof transactionDate === 'string' && transactionDate.length === 10) {
          const today = new Date();
          const [year, month, day] = transactionDate.split('-');
          finalCreatedAt = new Date(Number(year), Number(month) - 1, Number(day), today.getHours(), today.getMinutes(), today.getSeconds());
        } else {
          finalCreatedAt = new Date(transactionDate);
        }
      }

      // 1. Create Purchase
      const purchase = await tx.purchase.create({
        data: {
          invoiceNumber,
          supplierId,
          totalAmount,
          paymentStatus,
          paymentMethod,
          createdAt: finalCreatedAt,
        }
      });

      // 2. Pre-update all Product Prices in Master Data
      // This ensures if a purchase has multiple units of the same product, 
      // all snapshots will have the latest prices from this purchase.
      for (const item of items) {
        if (item.sellingPrice !== undefined && item.sellingPrice !== null) {
          const productPrice = await tx.productPrice.findFirst({
            where: { productId: item.productId, unitId: item.unitId }
          });
          if (productPrice) {
            await tx.productPrice.update({
              where: { id: productPrice.id },
              data: { price: Number(item.sellingPrice) }
            });
          }
        }
      }

      // 3. Process items, update stock, and create batches
      for (const item of items) {
        // Find product
        const product = await tx.product.findUnique({ 
          where: { id: item.productId },
          include: { prices: true }
        });
        if (!product) throw new Error(`Product ${item.productId} not found`);

        // Find conversion factor for the selected unit
        const pPrice = product.prices.find(p => p.unitId === item.unitId);
        const conversionFactor = pPrice?.conversionFactor || 1;
        const baseQuantity = Number(item.quantity) * conversionFactor;

        const newStock = product.stock + baseQuantity;
        const costPerBaseUnit = Number(item.costPrice) / conversionFactor;

        let newAverageCost = Number(product.averageCost);
        if (newStock > 0) {
           const oldTotalValue = product.stock * Number(product.averageCost);
           const newAddedValue = baseQuantity * costPerBaseUnit;
           newAverageCost = (oldTotalValue + newAddedValue) / newStock;
        }

        // 1. Create Purchase Item
        const purchaseItem = await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: item.productId,
            unitId: item.unitId,
            quantity: Number(item.quantity),
            costPrice: Number(item.costPrice)
          }
        });

        // 2. Create Stock Batch - Store in BASE UNITS
        const batch = await tx.stockBatch.create({
          data: {
            productId: item.productId,
            purchaseItemId: purchaseItem.id,
            initialQuantity: baseQuantity,
            currentQuantity: baseQuantity,
            costPrice: costPerBaseUnit,
            sellingPrice: (item.sellingPrice || 0) / conversionFactor,
            createdAt: purchase.createdAt,
            unitId: item.unitId,
            conversionFactor: conversionFactor
          }
        });

        // 3. SNAPSHOT ALL PRICES for this Batch
        const currentPrices = await tx.productPrice.findMany({
          where: { productId: item.productId }
        });

        if (currentPrices.length > 0) {
          await tx.stockBatchPrice.createMany({
            data: currentPrices.map(p => ({
              batchId: batch.id,
              unitId: p.unitId,
              price: p.price
            }))
          });
        }

        // 5. Update Product Stock and Cost
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: newStock,
            averageCost: newAverageCost,
            supplierId: supplierId
          }
        });

        // 6. Create StockLog
        await tx.stockLog.create({
          data: {
            productId: item.productId,
            type: "IN",
            quantity: baseQuantity,
            reason: `Purchase ${invoiceNumber}`,
            createdAt: purchase.createdAt
          }
        });
      }

      // 4. Handle Payable if not fully paid
      if (paymentStatus === "UNPAID" || paymentStatus === "PARTIAL") {
        const remainingBalance = Number(totalAmount) - (Number(amountPaid) || 0);
        
        let finalDueDate = dueDate ? new Date(dueDate) : null;
        if (!finalDueDate) {
          finalDueDate = new Date();
          finalDueDate.setDate(finalDueDate.getDate() + 30);
        }

        const payable = await tx.payable.create({
          data: {
            purchaseId: purchase.id,
            supplierId,
            amountDue: totalAmount,
            remainingBalance,
            dueDate: finalDueDate,
            status: paymentStatus
          }
        });

        // Record initial payment if partial
        if (paymentStatus === "PARTIAL" && amountPaid > 0) {
          await tx.payablePayment.create({
            data: {
              payableId: payable.id,
              amountPaid,
              method: paymentMethod
            }
          });
        }
      }

      // Fetch the full purchase data to return to client
      return tx.purchase.findUnique({
        where: { id: purchase.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                  prices: {
                    include: { unit: true }
                  }
                }
              },
              stockBatch: true,
              unit: true
            }
          }
        }
      });
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Create Purchase Error:", error);
    res.status(400).json({ error: error.message || "Failed to create purchase" });
  }
};
