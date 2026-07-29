import prisma from "../config/db.ts";
import { ApiError } from "../utils/ApiError.ts";

export class UnitService {
  static async getAll() {
    return await prisma.unit.findMany({
      where: { deletedAt: null }
    });
  }

  static async create(name: string, userId?: string) {
    if (!name) throw new ApiError(400, "Nama satuan wajib diisi");
    
    // Check if it already exists (including soft-deleted)
    const existing = await prisma.unit.findUnique({ where: { name } });
    
    if (existing) {
      if (existing.deletedAt) {
        // Restore soft-deleted unit
        const unit = await prisma.unit.update({
          where: { id: existing.id },
          data: { deletedAt: null }
        });

        if (userId) {
          const { AuditService } = await import("./AuditService.ts");
          await AuditService.log({
            userId,
            action: "CREATE_UNIT",
            entity: "Unit",
            entityId: unit.id,
            details: { name: unit.name, note: "Restored" }
          });
        }

        return unit;
      }
      throw new ApiError(400, `Satuan "${name}" sudah ada dan aktif.`);
    }

    const unit = await prisma.unit.create({ data: { name } });
    
    if (userId) {
      const { AuditService } = await import("./AuditService.ts");
      await AuditService.log({
        userId,
        action: "CREATE_UNIT",
        entity: "Unit",
        entityId: unit.id,
        details: { name: unit.name }
      });
    }

    return unit;
  }

  static async update(id: string, name: string, userId?: string) {
    if (!name) throw new ApiError(400, "Nama satuan wajib diisi");
    try {
      const unit = await prisma.unit.update({
        where: { id },
        data: { name },
      });

      if (userId) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "UPDATE_UNIT",
          entity: "Unit",
          entityId: unit.id,
          details: { name: unit.name }
        });
      }

      return unit;
    } catch (error) {
      throw new ApiError(404, "Satuan tidak ditemukan");
    }
  }

  static async delete(id: string, userId?: string) {
    try {
      const unit = await prisma.unit.findUnique({ where: { id }});
      await prisma.unit.update({ 
        where: { id },
        data: { deletedAt: new Date() }
      });

      if (userId && unit) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "DELETE_UNIT",
          entity: "Unit",
          entityId: id,
          details: { name: unit.name }
        });
      }

      return { success: true };
    } catch (error) {
      throw new ApiError(404, "Satuan tidak ditemukan");
    }
  }
}
