import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getPayables = async (req: Request, res: Response) => {
  try {
    const { page, limit, search } = req.query;
    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { purchase: { invoiceNumber: { contains: search as string, mode: 'insensitive' } } },
        { supplier: { name: { contains: search as string, mode: 'insensitive' } } },
        { reference: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (page && limit) {
      const p = Number(page);
      const l = Number(limit);
      const skip = (p - 1) * l;

      const [items, total] = await Promise.all([
        prisma.payable.findMany({
          where,
          include: {
            supplier: true,
            purchase: {
              include: {
                items: {
                  include: {
                    product: true,
                    unit: true
                  }
                }
              }
            },
            payments: true
          },
          orderBy: { dueDate: "asc" },
          skip,
          take: l
        }),
        prisma.payable.count({ where })
      ]);
      return res.json({ items, total });
    }

    const payables = await prisma.payable.findMany({
      where,
      include: {
        supplier: true,
        purchase: {
          include: {
            items: {
              include: {
                product: true,
                unit: true
              }
            }
          }
        },
        payments: true
      },
      orderBy: { dueDate: "asc" }
    });
    res.json(payables);
  } catch (error) {
    console.error("Get Payables Error:", error);
    res.status(500).json({ error: "Failed to get payables" });
  }
};

export const createPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amountPaid, method, attachment, discount } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const payable = await tx.payable.findUnique({ where: { id } });
      if (!payable) throw new Error("Payable not found");

      const amount = Number(amountPaid);
      if (amount <= 0) throw new Error("Amount must be greater than 0");

      const discountAmount = Number(discount) || 0;
      let newRemaining = Number(payable.remainingBalance) - (amount + discountAmount);
      if (newRemaining < 0) newRemaining = 0;

      let newStatus = payable.status;
      if (newRemaining === 0) {
        newStatus = "PAID";
      } else if (newRemaining < Number(payable.amountDue)) {
        newStatus = "PARTIAL";
      }

      const payment = await tx.payablePayment.create({
        data: {
          payableId: id,
          amountPaid: amount,
          discount: discountAmount,
          method,
          attachment
        }
      });

      await tx.payable.update({
        where: { id },
        data: {
          remainingBalance: newRemaining,
          status: newStatus
        }
      });

      // Update purchase status if payable is paid and purchase exists
      if (payable.purchaseId) {
        await tx.purchase.update({
          where: { id: payable.purchaseId },
          data: {
            paymentStatus: newStatus
          }
        });
      }

      return payment;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Create Payable Payment Error:", error);
    res.status(400).json({ error: error.message || "Failed to create payment" });
  }
};

export const bulkPayment = async (req: Request, res: Response) => {
  try {
    const { supplierId, amount, paymentMethod, attachment } = req.body;
    
    if (!supplierId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    let remainingPayment = Number(amount);

    const result = await prisma.$transaction(async (tx) => {
      const payables = await tx.payable.findMany({
        where: { 
          supplierId, 
          status: { not: "PAID" },
          deletedAt: null
        },
        orderBy: { dueDate: "asc" }
      });

      const paymentsCreated = [];

      for (const payable of payables) {
        if (remainingPayment <= 0) break;

        const payableRemaining = Number(payable.remainingBalance);
        const amountToApply = Math.min(payableRemaining, remainingPayment);
        
        const newRemaining = payableRemaining - amountToApply;
        const newStatus = newRemaining <= 0 ? "PAID" : "PARTIAL";

        const payment = await tx.payablePayment.create({
          data: {
            payableId: payable.id,
            amountPaid: amountToApply,
            method: paymentMethod,
            attachment
          }
        });
        paymentsCreated.push(payment);

        await tx.payable.update({
          where: { id: payable.id },
          data: {
            remainingBalance: newRemaining,
            status: newStatus
          }
        });

        if (payable.purchaseId) {
          await tx.purchase.update({
            where: { id: payable.purchaseId },
            data: { paymentStatus: newStatus }
          });
        }

        remainingPayment -= amountToApply;
      }

      return paymentsCreated;
    });

    res.json({ message: "Bulk payment successful", payments: result });
  } catch (error: any) {
    console.error("Bulk Payment Error:", error);
    res.status(400).json({ error: error.message || "Bulk payment failed" });
  }
};

export const createPayable = async (req: Request, res: Response) => {
  try {
    const { supplierId, amountDue, dueDate, reference, notes, transactionDate } = req.body;
    if (!supplierId || !amountDue || amountDue <= 0 || !dueDate) {
      return res.status(400).json({ error: "Parameter tidak lengkap atau tidak valid" });
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    const count = await prisma.payable.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay }
      }
    });
    
    const sequence = (count + 1).toString().padStart(3, '0');
    const autoRef = `AP-${dateStr}-${sequence}`;

    const result = await prisma.payable.create({
      data: {
        supplierId,
        amountDue: Number(amountDue),
        remainingBalance: Number(amountDue),
        dueDate: new Date(dueDate),
        status: "UNPAID",
        reference: reference && reference.trim() !== "" ? reference : autoRef,
        notes: notes || null,
        createdAt: transactionDate ? new Date(transactionDate) : undefined
      }
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Create Payable Error:", error);
    res.status(400).json({ error: error.message || "Failed to create payable" });
  }
};

export const getPayablePayments = async (req: Request, res: Response) => {
  try {
    const { page, limit, search, startDate, endDate, method } = req.query;
    const where: any = {};
    
    if (method && method !== "ALL") {
      where.method = method as string;
    }
    
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate as string);
      if (endDate) where.paymentDate.lte = new Date(endDate as string);
    }
    
    if (search) {
      where.OR = [
        { payable: { purchase: { invoiceNumber: { contains: search as string, mode: 'insensitive' } } } },
        { payable: { supplier: { name: { contains: search as string, mode: 'insensitive' } } } },
        { payable: { reference: { contains: search as string, mode: 'insensitive' } } }
      ];
    }

    const orderBy = { paymentDate: "desc" as const };
    const include = {
      payable: {
        include: {
          supplier: true,
          purchase: {
            select: {
              invoiceNumber: true,
              createdAt: true
            }
          }
        }
      }
    };

    if (page && limit) {
      const p = Number(page);
      const l = Number(limit);
      const skip = (p - 1) * l;
      const [items, total] = await Promise.all([
        prisma.payablePayment.findMany({
          where,
          include,
          orderBy,
          skip,
          take: l
        }),
        prisma.payablePayment.count({ where })
      ]);
      return res.json({ items, total });
    }

    const items = await prisma.payablePayment.findMany({
      where,
      include,
      orderBy
    });
    res.json(items);
  } catch (error) {
    console.error("Get Payable Payments Error:", error);
    res.status(500).json({ error: "Failed to get payable payments" });
  }
};

export const updatePayableAmount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amountDue } = req.body;

    if (!amountDue || amountDue <= 0) {
      return res.status(400).json({ error: "Invalid amount due" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payable = await tx.payable.findUnique({
        where: { id },
        include: { payments: true }
      });
      if (!payable || payable.deletedAt) throw new Error("Payable not found");

      const totalPaid = payable.payments.reduce((sum, p) => sum + Number(p.amountPaid) + Number((p as any).discount || 0), 0);
      let newRemaining = Number(amountDue) - totalPaid;
      if (newRemaining < 0) newRemaining = 0;

      let newStatus = payable.status;
      if (newRemaining === 0) {
        newStatus = "PAID";
      } else if (newRemaining < Number(amountDue)) {
        newStatus = "PARTIAL";
      } else {
        newStatus = "UNPAID";
      }

      const updated = await tx.payable.update({
        where: { id },
        data: {
          amountDue: Number(amountDue),
          remainingBalance: newRemaining,
          status: newStatus
        }
      });
      
      if (updated.purchaseId) {
        await tx.purchase.update({
          where: { id: updated.purchaseId },
          data: { paymentStatus: newStatus }
        });
      }

      return updated;
    });

    res.json(result);
  } catch (error: any) {
    console.error("Update Payable Amount Error:", error);
    res.status(400).json({ error: error.message || "Failed to update payable amount" });
  }
};

export const deletePayable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const payable = await tx.payable.findUnique({ where: { id } });
      if (!payable || payable.deletedAt) throw new Error("Payable not found");

      await tx.payable.update({ 
        where: { id },
        data: { deletedAt: new Date() }
      });

      if (payable.purchaseId) {
         // Reset purchase payment status if payable is deleted
         await tx.purchase.update({
           where: { id: payable.purchaseId },
           data: { paymentStatus: "UNPAID" }
         });
      }
      return { success: true };
    });

    res.json(result);
  } catch (error: any) {
    console.error("Delete Payable Error:", error);
    res.status(400).json({ error: error.message || "Failed to delete payable" });
  }
};
