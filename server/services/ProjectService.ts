import prisma from "../config/db.ts";
import { ApiError } from "../utils/ApiError.ts";

export class ProjectService {
  static async getAll(customerId?: string) {
    return await prisma.project.findMany({
      where: customerId ? { customerId } : {},
      include: { customer: true, sales: true }
    });
  }

  static async create(data: {
    customerId: string;
    projectName: string;
    location?: string;
    status?: string;
    budget?: number;
    specialDiscount?: number;
  }, userId?: string) {
    if (!data.customerId || !data.projectName) {
      throw new ApiError(400, "Pelanggan dan nama proyek wajib diisi");
    }

    const project = await prisma.project.create({
      data: { 
        customerId: data.customerId, 
        projectName: data.projectName, 
        location: data.location, 
        status: data.status || "ACTIVE",
        budget: data.budget || 0,
        specialDiscount: data.specialDiscount || 0
      }
    });

    if (userId) {
      const { AuditService } = await import("./AuditService.ts");
      await AuditService.log({
        userId,
        action: "CREATE_PROJECT",
        entity: "Project",
        entityId: project.id,
        details: { projectName: project.projectName }
      });
    }

    return project;
  }

  static async update(id: string, data: any, userId?: string) {
    try {
      const project = await prisma.project.update({
        where: { id },
        data: { 
          projectName: data.projectName, 
          location: data.location, 
          status: data.status,
          budget: data.budget ? Number(data.budget) : undefined,
          specialDiscount: data.specialDiscount ? Number(data.specialDiscount) : undefined
        }
      });

      if (userId) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "UPDATE_PROJECT",
          entity: "Project",
          entityId: project.id,
          details: { projectName: project.projectName }
        });
      }

      return project;
    } catch (error) {
      throw new ApiError(404, "Proyek tidak ditemukan");
    }
  }

  static async delete(id: string, userId?: string) {
    try {
      const project = await prisma.project.delete({ where: { id } });

      if (userId) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "DELETE_PROJECT",
          entity: "Project",
          entityId: project.id,
          details: { projectName: project.projectName }
        });
      }

      return { success: true };
    } catch (error) {
      throw new ApiError(404, "Proyek tidak ditemukan atau memiliki ketergantungan data");
    }
  }

  static async getReport(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        customer: true,
        sales: {
          include: {
            items: {
              include: {
                product: true,
                unit: true
              }
            }
          }
        }
      }
    });

    if (!project) throw new ApiError(404, "Proyek tidak ditemukan");

    const materialSummary: Record<string, any> = {};

    project.sales.forEach(sale => {
      sale.items.forEach(item => {
        const key = item.productId;
        if (!materialSummary[key]) {
          materialSummary[key] = {
            name: item.product.name,
            totalQty: 0,
            unitName: item.unit.name,
            totalValue: 0
          };
        }
        materialSummary[key].totalQty += item.quantity;
        materialSummary[key].totalValue += Number(item.priceAtSale) * item.quantity;
      });
    });

    return {
      project,
      materialSummary: Object.values(materialSummary),
      totalUsage: project.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0)
    };
  }
}
