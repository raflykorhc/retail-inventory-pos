import prisma from "../config/db.ts";
import { ApiError } from "../utils/ApiError.ts";

export class DebtService {
  static async create(data: { customerId: string; amountDue: number; dueDate: string; reference?: string; notes?: string; transactionDate?: string }) {
    const { customerId, amountDue, dueDate, reference, notes, transactionDate } = data;
    if (!customerId || !amountDue || amountDue <= 0 || !dueDate) {
      throw new ApiError(400, "Parameter tidak lengkap atau tidak valid");
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    const count = await prisma.debt.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay }
      }
    });
    
    const sequence = (count + 1).toString().padStart(3, '0');
    const autoRef = `AR-${dateStr}-${sequence}`;

    return await prisma.debt.create({
      data: {
        customerId,
        amountDue: Number(amountDue),
        remainingBalance: Number(amountDue),
        dueDate: new Date(dueDate),
        status: "UNPAID",
        reference: reference && reference.trim() !== "" ? reference : autoRef,
        notes: notes || null,
        createdAt: transactionDate ? new Date(transactionDate) : undefined
      }
    });
  }

  static async getAll(page?: number, limit?: number, search?: string) {
    const where: any = { deletedAt: null };
    
    if (search) {
      where.OR = [
        { sale: { invoiceNumber: { contains: search, mode: 'insensitive' } } },
        { sale: { customer: { name: { contains: search, mode: 'insensitive' } } } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { reference: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        prisma.debt.findMany({
          where,
          include: {
            sale: { include: { customer: true, items: { include: { product: true, unit: true } } } },
            customer: true,
            payments: true
          },
          orderBy: { dueDate: "asc" },
          skip,
          take: limit
        }),
        prisma.debt.count({ where })
      ]);
      return { items, total };
    }

    return await prisma.debt.findMany({
      where,
      include: {
        sale: { include: { customer: true, items: { include: { product: true, unit: true } } } },
        customer: true,
        payments: true
      },
      orderBy: { dueDate: "asc" }
    });
  }

  static async addPayment(id: string, data: { amountPaid: number; discount?: number; method?: string; attachment?: string }) {
    const debt = await prisma.debt.findUnique({ where: { id } });
    if (!debt) throw new ApiError(404, "Data piutang tidak ditemukan");

    const discountAmount = Number(data.discount) || 0;
    const newRemaining = Number(debt.remainingBalance) - (Number(data.amountPaid) + discountAmount);
    const newStatus = newRemaining <= 0 ? "PAID" : "PARTIAL";

    return await prisma.$transaction(async (tx) => {
      const payment = await tx.debtPayment.create({
        data: {
          debtId: id,
          amountPaid: Number(data.amountPaid),
          discount: discountAmount,
          method: data.method || "TRANSFER",
          attachment: data.attachment || null
        }
      });

      const updatedDebt = await tx.debt.update({
        where: { id },
        data: {
          remainingBalance: Math.max(0, newRemaining),
          status: newStatus
        }
      });

      // Update Sale Status if fully paid
      if (newRemaining <= 0 && debt.saleId) {
        await tx.sale.update({
          where: { id: debt.saleId },
          data: { paymentStatus: "LUNAS" }
        });
      }

      return { payment, updatedDebt };
    });
  }

  /**
   * FIFO (First In First Out) Bulk Payment logic
   */
  static async bulkPayment(customerId: string, amount: number, paymentMethod: string, attachment?: string) {
    if (!customerId || !amount || amount <= 0) {
      throw new ApiError(400, "Parameter tidak valid");
    }

    return await prisma.$transaction(async (tx) => {
      const whereClause: any = { status: { not: "PAID" }, deletedAt: null };
      if (customerId === "UMUM") {
        whereClause.OR = [
          { customerId: null, saleId: null },
          { customerId: null, sale: { customerId: null } }
        ];
      } else {
        whereClause.OR = [
          { customerId },
          { customerId: null, sale: { customerId } }
        ];
      }

      const debts = await tx.debt.findMany({
        where: whereClause,
        orderBy: { dueDate: 'asc' }
      });

      let remainingAmount = Number(amount);
      const paymentsMade = [];

      for (const debt of debts) {
        if (remainingAmount <= 0) break;

        const debtBalance = Number(debt.remainingBalance);
        const paymentAmount = Math.min(debtBalance, remainingAmount);

        const payment = await tx.debtPayment.create({
          data: {
            debtId: debt.id,
            amountPaid: paymentAmount,
            method: paymentMethod || "CASH",
            attachment: attachment || null
          }
        });

        const newBalance = debtBalance - paymentAmount;
        await tx.debt.update({
          where: { id: debt.id },
          data: {
            remainingBalance: newBalance,
            status: newBalance <= 0 ? "PAID" : "PARTIAL"
          }
        });

        if (newBalance <= 0 && debt.saleId) {
          await tx.sale.update({
            where: { id: debt.saleId },
            data: { paymentStatus: "LUNAS" }
          });
        }

        paymentsMade.push(payment);
        remainingAmount -= paymentAmount;
      }

      return { paymentsMade, remainingAmountUnused: remainingAmount };
    });
  }

  static async sendReminder(id: string, data?: { notes?: string; method?: string }) {
    const debt = await prisma.debt.findUnique({
      where: { id },
      include: { 
        sale: { include: { customer: true } },
        customer: true
      }
    });

    if (!debt) throw new ApiError(404, "Data piutang tidak ditemukan");
    const customer = debt.sale?.customer || debt.customer;
    if (!customer) throw new ApiError(400, "Pelanggan tidak ditemukan");

    let newNotes = debt.notes;
    if (data?.notes) {
      const now = new Date();
      // Format as YYYY-MM-DD HH:MM
      const formattedDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .replace('T', ' ')
        .substring(0, 16);
      
      const methodLabel = data.method ? data.method.toUpperCase() : "FOLLOW-UP";
      const logEntry = `[${formattedDate}] [${methodLabel}] ${data.notes}`;
      newNotes = debt.notes ? `${debt.notes}\n${logEntry}` : logEntry;
    }

    await prisma.debt.update({
      where: { id },
      data: { 
        lastReminderSent: new Date(),
        notes: newNotes
      }
    });

    return { 
      success: true, 
      message: `Berhasil mencatat follow-up untuk ${customer.name}`,
      notes: newNotes,
      lastReminderSent: new Date()
    };
  }

  static async getPayments(filters: {
    page?: number;
    limit?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    method?: string;
  }) {
    const { page, limit, search, startDate, endDate, method } = filters;
    const where: any = {};

    if (method && method !== "ALL") {
      where.method = method;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { debt: { sale: { invoiceNumber: { contains: search, mode: 'insensitive' } } } },
        { debt: { sale: { customer: { name: { contains: search, mode: 'insensitive' } } } } },
        { debt: { customer: { name: { contains: search, mode: 'insensitive' } } } },
        { debt: { reference: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const include = {
      debt: {
        include: {
          sale: { include: { customer: true } },
          customer: true
        }
      }
    };

    const orderBy = { paymentDate: "desc" as const };

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        prisma.debtPayment.findMany({
          where,
          include,
          orderBy,
          skip,
          take: limit
        }),
        prisma.debtPayment.count({ where })
      ]);
      return { items, total };
    }

    const items = await prisma.debtPayment.findMany({
      where,
      include,
      orderBy
    });
    return items;
  }

  static async updateAmount(id: string, amountDue: number) {
    if (!amountDue || amountDue <= 0) {
      throw new ApiError(400, "Nominal hutang/piutang tidak valid");
    }

    return await prisma.$transaction(async (tx) => {
      const debt = await tx.debt.findUnique({
        where: { id },
        include: { payments: true }
      });
      if (!debt || debt.deletedAt) throw new ApiError(404, "Data piutang tidak ditemukan");

      const totalPaid = debt.payments.reduce((sum, p) => sum + Number(p.amountPaid) + Number((p as any).discount || 0), 0);
      let newRemaining = Number(amountDue) - totalPaid;
      if (newRemaining < 0) newRemaining = 0;

      let newStatus = debt.status;
      if (newRemaining === 0) {
        newStatus = "PAID";
      } else if (newRemaining < Number(amountDue)) {
        newStatus = "PARTIAL";
      } else {
        newStatus = "UNPAID";
      }

      const updated = await tx.debt.update({
        where: { id },
        data: {
          amountDue: Number(amountDue),
          remainingBalance: newRemaining,
          status: newStatus
        }
      });

      if (updated.saleId) {
        await tx.sale.update({
          where: { id: updated.saleId },
          data: { paymentStatus: newStatus === "PAID" ? "LUNAS" : newStatus === "PARTIAL" ? "CICIL" : "BELUM BAYAR" }
        });
      }

      return updated;
    });
  }

  static async delete(id: string) {
    return await prisma.$transaction(async (tx) => {
      const debt = await tx.debt.findUnique({ where: { id } });
      if (!debt || debt.deletedAt) throw new ApiError(404, "Data piutang tidak ditemukan");

      await tx.debt.update({ 
        where: { id },
        data: { deletedAt: new Date() }
      });

      if (debt.saleId) {
        // Reset paymentStatus
        await tx.sale.update({
          where: { id: debt.saleId },
          data: { paymentStatus: "BELUM BAYAR" }
        });
      }

      return { success: true };
    });
  }
}
