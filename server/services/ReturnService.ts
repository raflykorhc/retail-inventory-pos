import prisma from "../config/db.ts";
import { ApiError } from "../utils/ApiError.ts";

export class ReturnService {
  static async getAll() {
    return await prisma.return.findMany({
      include: {
        customer: true,
        sale: true,
        items: { include: { product: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  static async create(data: {
    saleId: string;
    customerId: string;
    reason: string;
    resolution: string;
    items: any[];
  }, userId?: string) {
    const { saleId, customerId, reason, resolution, items } = data;

    return await prisma.$transaction(async (tx) => {
      const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.price)), 0);

      // 1. Create Return Record
      const retur = await tx.return.create({
        data: {
          returnNumber: `RET-${Date.now()}`,
          saleId,
          customerId,
          reason,
          resolution: resolution || "REFUND",
          totalAmount: totalAmount,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: Number(item.quantity),
              price: Number(item.price),
              condition: item.condition || "GOOD"
            }))
          }
        }
      });

      // 2. Stock Recovery Logic
      for (const item of items) {
        if (item.condition === "GOOD") {
          // Find the original cost price from SaleItemBatch if possible
          let originalCost = 0;
          let actualBaseQty = Number(item.quantity); // Fallback

          if (saleId) {
            const saleItem = await tx.saleItem.findFirst({
              where: { saleId, productId: item.productId },
              include: { batchAllocations: true }
            });
            if (saleItem && saleItem.batchAllocations.length > 0) {
              const totalBaseQty = saleItem.batchAllocations.reduce((sum: number, b: any) => sum + b.quantity, 0);
              const ratio = totalBaseQty / saleItem.quantity;
              actualBaseQty = Number(item.quantity) * ratio;

              // Use the cost price of the first batch allocation as reference
              originalCost = Number(saleItem.batchAllocations[0].costPrice);
            }
          }

          // Fallback to product average cost if not found
          if (originalCost === 0) {
            const prod = await tx.product.findUnique({ where: { id: item.productId } });
            originalCost = Number(prod?.averageCost || 0);
          }

          // Create a new StockBatch for the returned item
          await tx.stockBatch.create({
            data: {
              productId: item.productId,
              initialQuantity: actualBaseQty,
              currentQuantity: actualBaseQty,
              costPrice: originalCost,
            }
          } as any);

          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: actualBaseQty } }
          });

          await tx.stockLog.create({
            data: {
              productId: item.productId,
              type: "IN",
              quantity: actualBaseQty,
              reason: `Retur ${retur.returnNumber} (Kondisi Baik)`
            }
          });
        } else {
          // Log as ADJUSTMENT for damaged goods
          await tx.stockLog.create({
            data: {
              productId: item.productId,
              type: "ADJUSTMENT",
              quantity: 0,
              reason: `Retur ${retur.returnNumber} (Kondisi Rusak - Tidak Masuk Stok)`
            }
          });
        }
      }

      // 3. Financial Resolution: DEDUCT_DEBT
      if (resolution === "DEDUCT_DEBT" && saleId) {
        const debt = await tx.debt.findFirst({
          where: { saleId, status: { not: "PAID" } }
        });

        if (debt) {
          const debtBalance = Number(debt.remainingBalance);
          const deductAmount = Math.min(debtBalance, totalAmount);

          await tx.debtPayment.create({
            data: {
              debtId: debt.id,
              amountPaid: deductAmount,
              method: "RETURN_DEDUCTION",
              attachment: null
            }
          });

          const newBalance = debtBalance - deductAmount;
          await tx.debt.update({
            where: { id: debt.id },
            data: {
              remainingBalance: newBalance,
              status: newBalance <= 0 ? "PAID" : "PARTIAL"
            }
          });
          
          if (newBalance <= 0) {
            await tx.sale.update({
              where: { id: saleId },
              data: { paymentStatus: "LUNAS" }
            });
          }
        }
      }



      if (userId) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "CREATE_RETURN",
          entity: "Return",
          entityId: retur.id,
          details: { returnNumber: retur.returnNumber, reason }
        });
      }

      return retur;
    });
  }
}
