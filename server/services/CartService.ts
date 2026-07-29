import prisma from "../config/db.ts";

export class CartService {
  static async getBySessionId(sessionId: string) {
    return await prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            product: {
              include: {
                prices: { include: { unit: true } },
                stockBatches: {
                  where: { currentQuantity: { gt: 0 }, isArchived: false },
                  orderBy: { createdAt: "desc" }
                }
              }
            }
          }
        }
      }
    });
  }

  static async sync(sessionId: string, items: any[]) {
    return await prisma.cart.upsert({
      where: { sessionId },
      create: {
        sessionId,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            unitId: item.unitId,
            batchId: item.batchId,
            price: Number(item.price) || 0,
            discount: Number(item.discount) || 0,
            quantity: Number(item.quantity) || 0,
            takenQuantity: item.takenQuantity !== undefined ? Number(item.takenQuantity) : null,
            isBonus: item.isBonus || false
          }))
        }
      },
      update: {
        items: {
          deleteMany: {},
          create: items.map((item: any) => ({
            productId: item.productId,
            unitId: item.unitId,
            batchId: item.batchId,
            price: Number(item.price) || 0,
            discount: Number(item.discount) || 0,
            quantity: Number(item.quantity) || 0,
            takenQuantity: item.takenQuantity !== undefined ? Number(item.takenQuantity) : null,
            isBonus: item.isBonus || false
          }))
        }
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                prices: { include: { unit: true } },
                stockBatches: {
                  where: { currentQuantity: { gt: 0 }, isArchived: false },
                  orderBy: { createdAt: "desc" }
                }
              }
            }
          }
        }
      }
    });
  }
}
