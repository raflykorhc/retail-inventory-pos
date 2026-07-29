import prisma from "../config/db.ts";

export class AuditService {
  static async log(data: {
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    details?: any;
    ipAddress?: string;
  }) {
    try {
      await prisma.auditLogs.create({
        data: {
          userId: data.userId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          details: data.details ? JSON.stringify(data.details) : null,
          ipAddress: data.ipAddress,
        },
      });
    } catch (error) {
      console.error("Audit Log Error:", error);
    }
  }
}
