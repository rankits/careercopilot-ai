import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/shared/config/db.conf.js";

export interface AuditContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface WriteAuditLogInput {
  adminId?: number | null;
  userId?: number | null;
  action: AuditAction;
  context?: AuditContext;
  metadata?: Record<string, unknown>;
}

/**
 * Principal-agnostic audit trail writer, shared by the `auth` and `admin`
 * modules (and any future module that needs to record a security-relevant
 * event). Kept as a single insert helper here rather than duplicated
 * per-module repository methods, since the `AuditLog` model itself is
 * shared across principal types.
 */
export const AuditService = {
  async write(entry: WriteAuditLogInput): Promise<void> {
    await prisma.auditLog.create({
      data: {
        adminId: entry.adminId ?? null,
        userId: entry.userId ?? null,
        action: entry.action,
        ipAddress: entry.context?.ipAddress,
        userAgent: entry.context?.userAgent,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  },
};
