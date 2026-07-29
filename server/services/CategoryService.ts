import prisma from "../config/db.ts";
import { ApiError } from "../utils/ApiError.ts";

export class CategoryService {
  static async getAll() {
    return await prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" }
    });
  }

  static async create(name: string, userId?: string) {
    if (!name) throw new ApiError(400, "Nama kategori wajib diisi");
    
    // Check if it already exists (including soft-deleted)
    const existing = await prisma.category.findUnique({ where: { name } });
    
    if (existing) {
      if (existing.deletedAt) {
        // Restore soft-deleted category
        const category = await prisma.category.update({
          where: { id: existing.id },
          data: { deletedAt: null }
        });
        
        if (userId) {
          const { AuditService } = await import("./AuditService.ts");
          await AuditService.log({
            userId,
            action: "CREATE_CATEGORY",
            entity: "Category",
            entityId: category.id,
            details: { name: category.name, note: "Restored" }
          });
        }
        
        return category;
      }
      throw new ApiError(400, `Kategori "${name}" sudah ada dan aktif.`);
    }

    const category = await prisma.category.create({ data: { name } });
    
    if (userId) {
      const { AuditService } = await import("./AuditService.ts");
      await AuditService.log({
        userId,
        action: "CREATE_CATEGORY",
        entity: "Category",
        entityId: category.id,
        details: { name: category.name }
      });
    }
    
    return category;
  }

  static async update(id: string, name: string, userId?: string) {
    if (!name) throw new ApiError(400, "Nama kategori wajib diisi");
    try {
      const category = await prisma.category.update({
        where: { id },
        data: { name },
      });
      
      if (userId) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "UPDATE_CATEGORY",
          entity: "Category",
          entityId: category.id,
          details: { name: category.name }
        });
      }
      
      return category;
    } catch (error) {
      throw new ApiError(404, "Kategori tidak ditemukan");
    }
  }

  static async delete(id: string, userId?: string) {
    try {
      const category = await prisma.category.findUnique({ where: { id }});
      await prisma.category.update({ 
        where: { id },
        data: { deletedAt: new Date() }
      });
      
      if (userId && category) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "DELETE_CATEGORY",
          entity: "Category",
          entityId: id,
          details: { name: category.name }
        });
      }
      
      return { success: true };
    } catch (error) {
      throw new ApiError(404, "Kategori tidak ditemukan");
    }
  }
}
