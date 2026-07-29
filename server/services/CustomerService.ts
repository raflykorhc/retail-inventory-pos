import prisma from "../config/db.ts";
import { ApiError } from "../utils/ApiError.ts";

export class CustomerService {
  static async getAll() {
    const customers = await prisma.customer.findMany({
      where: { deletedAt: null },
      include: {
        sales: {
          where: { deletedAt: null }
        },
        debts: {
          where: { deletedAt: null },
          include: {
            sale: true
          }
        }
      }
    });
    
    return customers.map(customer => {
      const totalSpent = customer.sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
      const transactionCount = customer.sales.length;
      const totalDebt = customer.debts.reduce((sum, debt) => sum + Number(debt.remainingBalance), 0);
      
      // Determine Tier
      let tier = "REGULAR";
      if (totalSpent >= 500000000) {
        tier = "PLATINUM";
      } else if (totalSpent >= 100000000) {
        tier = "VIP";
      }
      
      return {
        ...customer,
        totalSpent,
        transactionCount,
        totalDebt,
        tier
      };
    });
  }

  static async create(data: {
    name: string;
    phone?: string;
    address?: string;
    email?: string;
    notes?: string;
    isContractor?: boolean;
    creditLimit?: number;
    billingDate?: number;
  }, userId?: string) {
    if (!data.name) throw new ApiError(400, "Nama pelanggan wajib diisi");
    
    const customer = await prisma.customer.create({
      data: { 
        name: data.name, 
        phone: data.phone, 
        address: data.address, 
        email: data.email,
        notes: data.notes,
        isContractor: Boolean(data.isContractor), 
        creditLimit: data.creditLimit ? Number(data.creditLimit) : null,
        billingDate: data.billingDate ? Number(data.billingDate) : null
      }
    });
    
    if (userId) {
      const { AuditService } = await import("./AuditService.ts");
      await AuditService.log({
        userId,
        action: "CREATE_CUSTOMER",
        entity: "Customer",
        entityId: customer.id,
        details: { name: customer.name }
      });
    }
    
    return customer;
  }

  static async update(id: string, data: any, userId?: string) {
    try {
      const customer = await prisma.customer.update({
        where: { id },
        data: { 
          name: data.name, 
          phone: data.phone, 
          address: data.address, 
          email: data.email,
          notes: data.notes,
          isContractor: data.isContractor !== undefined ? Boolean(data.isContractor) : undefined, 
          creditLimit: data.creditLimit !== undefined ? (data.creditLimit ? Number(data.creditLimit) : null) : undefined,
          billingDate: data.billingDate !== undefined ? (data.billingDate ? Number(data.billingDate) : null) : undefined
        }
      });
      
      if (userId) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "UPDATE_CUSTOMER",
          entity: "Customer",
          entityId: id,
          details: { name: customer.name }
        });
      }
      
      return customer;
    } catch (error) {
      throw new ApiError(404, "Pelanggan tidak ditemukan");
    }
  }

  static async delete(id: string, userId?: string) {
    try {
      const customer = await prisma.customer.delete({ where: { id } });
      
      if (userId) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "DELETE_CUSTOMER",
          entity: "Customer",
          entityId: id,
          details: { name: customer.name }
        });
      }
      
      return { success: true };
    } catch (error) {
      throw new ApiError(404, "Pelanggan tidak ditemukan atau memiliki data transaksi aktif");
    }
  }



  static async import(customers: any[]) {
    return await prisma.$transaction(
      customers.map((c) => 
        prisma.customer.create({
          data: {
            name: c.name,
            phone: c.phone,
            email: c.email,
            address: c.address,
            isContractor: Boolean(c.isContractor),
            creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
            notes: c.notes
          }
        })
      )
    );
  }

  static async getHistory(id: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      prisma.sale.findMany({
        where: { customerId: id, deletedAt: null },
        include: { 
          items: {
            include: {
              product: true,
              unit: true,
              batchAllocations: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.sale.count({
        where: { customerId: id, deletedAt: null }
      })
    ]);
    
    return { items, total, page, limit };
  }
}
