import prisma from "../config/db.ts";
import { ApiError } from "../utils/ApiError.ts";

export class ExpenseCategoryService {
  static async getAll() {
    return await prisma.expenseCategory.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { expenses: true } }
      },
      orderBy: [
        { expenses: { _count: 'desc' } },
        { name: 'asc' }
      ]
    });
  }

  static async create(data: { name: string }) {
    if (!data.name) throw new ApiError(400, "Nama kategori wajib diisi");
    
    const existing = await prisma.expenseCategory.findUnique({
      where: { name: data.name }
    });

    if (existing) {
      if (existing.deletedAt) {
        return await prisma.expenseCategory.update({
          where: { id: existing.id },
          data: { deletedAt: null }
        });
      }
      throw new ApiError(400, "Kategori sudah ada");
    }

    return await prisma.expenseCategory.create({
      data: { name: data.name }
    });
  }

  static async update(id: string, data: { name: string }) {
    if (!data.name) throw new ApiError(400, "Nama kategori wajib diisi");
    
    const existing = await prisma.expenseCategory.findFirst({
      where: { 
        name: data.name,
        id: { not: id }
      }
    });

    if (existing) {
      throw new ApiError(400, "Kategori dengan nama tersebut sudah ada");
    }

    return await prisma.expenseCategory.update({
      where: { id },
      data: { name: data.name }
    });
  }

  static async delete(id: string) {
    const category = await prisma.expenseCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { expenses: true } }
      }
    });

    if (!category) throw new ApiError(404, "Kategori tidak ditemukan");
    if (category._count.expenses > 0) {
      throw new ApiError(400, "Kategori tidak dapat dihapus karena sudah digunakan pada pengeluaran");
    }

    return await prisma.expenseCategory.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
