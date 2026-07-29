import fs from "fs";
import path from "path";
import prisma from "../config/db.ts";
import { ApiError } from "../utils/ApiError.ts";
import { SalesService } from "./SalesService.ts";

export class DeliveryService {
  static async getAll() {
    return await prisma.delivery.findMany({
      include: {
        customer: true,
        sale: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  static async createFromSale(data: {
    saleId: string;
    driverName?: string;
    vehiclePlate?: string;
    address?: string;
    items?: any[];
  }, userId?: string) {
    if (!data.driverName || data.driverName.trim() === "" || data.driverName.trim() === "-") {
      throw new ApiError(400, "Nama sopir wajib diisi");
    }
    if (!data.vehiclePlate || data.vehiclePlate.trim() === "" || data.vehiclePlate.trim() === "-") {
      throw new ApiError(400, "Pelat nomor kendaraan wajib diisi");
    }

    const sale = await prisma.sale.findUnique({
      where: { id: data.saleId },
      include: { 
        items: { include: { product: true, unit: true } }, 
        customer: true 
      }
    });

    if (!sale) throw new ApiError(404, "Penjualan tidak ditemukan");

    const deliveryItemsData = data.items && data.items.length > 0 
      ? data.items.map((item: any) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitName: item.unitName
        }))
      : sale.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitName: item.unit.name
        }));

    // Sequential doNumber format: DO/SB/YY/MM/XXXX
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `DO/SB/${yy}/${mm}/`;

    const lastDelivery = await prisma.delivery.findFirst({
      where: {
        doNumber: {
          startsWith: prefix
        }
      },
      orderBy: {
        doNumber: "desc"
      }
    });

    let nextSeq = 1;
    if (lastDelivery && lastDelivery.doNumber) {
      const parts = lastDelivery.doNumber.split("/");
      const lastSeqStr = parts[parts.length - 1];
      const lastSeq = parseInt(lastSeqStr, 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
    const doNumber = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    const delivery = await prisma.delivery.create({
      data: {
        doNumber,
        saleId: sale.id,
        customerId: sale.customerId,
        address: data.address || sale.customer?.address || "Alamat tidak tersedia",
        driverName: data.driverName.trim(),
        vehiclePlate: data.vehiclePlate.trim(),
        status: "PENDING",
        items: {
          create: deliveryItemsData
        }
      },
      include: { 
        items: { include: { product: true } },
        customer: true,
        sale: true
      }
    });

    if (userId) {
      const { AuditService } = await import("./AuditService.ts");
      await AuditService.log({
        userId,
        action: "CREATE_DELIVERY",
        entity: "Delivery",
        entityId: delivery.id,
        details: { doNumber: delivery.doNumber }
      });
    }

    return delivery;
  }

  static async update(id: string, data: {
    status?: string;
    signature?: string;
    driverName?: string;
    vehiclePlate?: string;
    address?: string;
    items?: any[];
  }, userId?: string) {
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: { 
        items: true,
        sale: { include: { items: true } }
      }
    });
    if (!delivery) throw new ApiError(404, "Data pengiriman tidak ditemukan");

    // Handle Signature base64 file upload if provided
    let signaturePath = data.signature;
    if (data.signature && data.signature.startsWith("data:image/")) {
      const matches = data.signature.match(/^data:image\/([A-Za-z-+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const extension = matches[1] === "jpeg" ? "jpg" : matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");

        const uploadsDir = path.join(process.cwd(), "uploads", "signatures");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filename = `sig-do-${id}-${Date.now()}.${extension}`;
        const filepath = path.join(uploadsDir, filename);

        fs.writeFileSync(filepath, buffer);
        signaturePath = `/uploads/signatures/${filename}`;
      }
    }

    // Normal, simple update without touching stock at all
    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        status: data.status,
        signature: signaturePath !== undefined ? signaturePath : delivery.signature,
        driverName: data.driverName !== undefined ? data.driverName : delivery.driverName,
        vehiclePlate: data.vehiclePlate !== undefined ? data.vehiclePlate : delivery.vehiclePlate,
        address: data.address !== undefined ? data.address : delivery.address,
        items: data.items ? {
          update: data.items.map((item: any) => ({
            where: { id: item.id },
            data: { isChecked: item.isChecked }
          }))
        } : undefined
      },
      include: {
        customer: true,
        sale: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // If status changed to DELIVERED, fulfill pending items and deduct stock
    if (data.status === "DELIVERED" && delivery.status !== "DELIVERED" && delivery.sale) {
      const itemsToTake: { saleItemId: string, takenQuantity: number }[] = [];
      
      for (const dItem of delivery.items) {
        // Find the matching saleItem
        const saleItem = (delivery.sale as any).items?.find((si: any) => si.productId === dItem.productId && si.pendingQuantity > 0);
        if (saleItem) {
          // Take up to what's available in pending or what's requested in delivery
          const takeQty = Math.min(Number(saleItem.pendingQuantity), Number(dItem.quantity));
          if (takeQty > 0) {
            itemsToTake.push({
              saleItemId: saleItem.id,
              takenQuantity: takeQty
            });
          }
        }
      }

      if (itemsToTake.length > 0) {
        await SalesService.fulfillPendingItems(delivery.saleId!, itemsToTake, userId, `Pengiriman Surat Jalan ${delivery.doNumber}`);
      }
    }

    if (userId) {
      const { AuditService } = await import("./AuditService.ts");
      await AuditService.log({
        userId,
        action: "UPDATE_DELIVERY",
        entity: "Delivery",
        entityId: id,
        details: { status: data.status, doNumber: updatedDelivery.doNumber }
      });
    }

    return updatedDelivery;
  }

  static async bulkTrip(data: {
    deliveryIds: string[];
    driverName: string;
    vehiclePlate: string;
  }, userId?: string) {
    if (!data.deliveryIds || data.deliveryIds.length === 0) {
      throw new ApiError(400, "Tidak ada Surat Jalan yang dipilih");
    }
    if (!data.driverName || data.driverName.trim() === "" || data.driverName.trim() === "-") {
      throw new ApiError(400, "Nama sopir wajib diisi untuk trip pengiriman");
    }
    if (!data.vehiclePlate || data.vehiclePlate.trim() === "" || data.vehiclePlate.trim() === "-") {
      throw new ApiError(400, "Pelat nomor kendaraan wajib diisi untuk trip pengiriman");
    }

    const tripId = `TRIP-${Date.now()}`;

    return await prisma.$transaction(async (tx) => {
      const updatedDeliveries = [];
      let seq = 1;
      for (const id of data.deliveryIds) {
        const updated = await tx.delivery.update({
          where: { id },
          data: {
            status: "ON_DELIVERY",
            driverName: data.driverName.trim(),
            vehiclePlate: `${data.vehiclePlate.trim()} | ${tripId}-${seq++}`
          }
        });
        updatedDeliveries.push(updated);
      }
      
      if (userId) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "BULK_TRIP_DELIVERY",
          entity: "Delivery",
          entityId: tripId,
          details: { deliveryCount: data.deliveryIds.length }
        });
      }
      
      return updatedDeliveries;
    });
  }

  static async delete(id: string, userId?: string) {
    try {
      const delivery = await prisma.delivery.findUnique({ where: { id }});
      await prisma.delivery.delete({ where: { id } });
      
      if (userId && delivery) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "DELETE_DELIVERY",
          entity: "Delivery",
          entityId: id,
          details: { doNumber: delivery.doNumber }
        });
      }
      
      return { success: true };
    } catch (error) {
      throw new ApiError(404, "Gagal menghapus data pengiriman");
    }
  }
}
