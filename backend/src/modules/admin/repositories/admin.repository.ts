import { Status, type Admin, type Prisma } from "@prisma/client";
import { prisma } from "../../../shared/config/db.conf.js";
import { securityConfig } from "../../../shared/config/security.conf.js";
import { AuditService, type WriteAuditLogInput } from "../../../shared/audit/audit.service.js";
import type { SystemStats } from "../types/admin.types.js";

export type AdminWithRole = Admin & { role: { name: string } };

export interface PasswordCredentials {
  passwordHash: string;
  passwordSalt: string;
}

export interface FailedLoginResult {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

const withRole = { include: { role: true } } as const;

export const adminRepository = {
  async findByEmail(email: string): Promise<AdminWithRole | null> {
    return prisma.admin.findUnique({ where: { email: email.toLowerCase() }, ...withRole });
  },

  async findByPublicId(publicId: string): Promise<AdminWithRole | null> {
    return prisma.admin.findUnique({ where: { publicId }, ...withRole });
  },

  async getPasswordCredentials(adminId: number): Promise<PasswordCredentials | null> {
    return prisma.adminMeta.findUnique({
      where: { adminId },
      select: { passwordHash: true, passwordSalt: true },
    });
  },

  async updatePassword(adminId: number, credentials: PasswordCredentials): Promise<void> {
    await prisma.adminMeta.update({ where: { adminId }, data: credentials });
  },

  async recordSuccessfulLogin(adminId: number, ip?: string | undefined): Promise<void> {
    await prisma.admin.update({
      where: { id: adminId },
      data: { lastLoginAt: new Date(), lastLoginIp: ip, failedLoginAttempts: 0, lockedUntil: null },
    });
  },

  async recordFailedLogin(adminId: number): Promise<FailedLoginResult> {
    const admin = await prisma.admin.update({
      where: { id: adminId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });

    if (admin.failedLoginAttempts >= securityConfig.lockout.threshold) {
      const lockedUntil = new Date(Date.now() + securityConfig.lockout.durationMinutes * 60 * 1000);
      await prisma.admin.update({ where: { id: adminId }, data: { lockedUntil } });
      return { failedLoginAttempts: admin.failedLoginAttempts, lockedUntil };
    }

    return { failedLoginAttempts: admin.failedLoginAttempts, lockedUntil: null };
  },

  /** Delegates to the shared, principal-agnostic audit writer - kept as a
   * repository method so callers don't need to know `AuditService` exists. */
  async writeAuditLog(entry: Omit<WriteAuditLogInput, "userId">): Promise<void> {
    await AuditService.write(entry);
  },

  async getSystemStats(): Promise<SystemStats> {
    const [totalUsers, activeUsers, pendingVerificationUsers, totalAdmins] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: Status.Active } }),
      prisma.user.count({ where: { status: Status.PendingVerification } }),
      prisma.admin.count(),
    ]);
    return { totalUsers, activeUsers, pendingVerificationUsers, totalAdmins };
  },
};

export default adminRepository;
