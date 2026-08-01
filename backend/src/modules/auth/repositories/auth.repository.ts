import { Status, type User } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { securityConfig } from '@/shared/config/security.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { DEFAULT_USER_ROLE_NAME } from '@/modules/auth/constants/auth.constant.js';

export type UserWithRole = User & { role: { name: string } };

export interface PasswordCredentials {
  passwordHash: string;
  passwordSalt: string;
}

export interface CreateUserInput extends PasswordCredentials {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | undefined;
}

export interface UpdatePendingUserInput extends PasswordCredentials {
  firstName: string;
  lastName: string;
  phone?: string | undefined;
}

export interface FailedLoginResult {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

const withRole = { include: { role: true } } as const;

export const authRepository = {
  async findUserByEmail(email: string): Promise<UserWithRole | null> {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() }, ...withRole });
  },

  async findUserById(id: number): Promise<UserWithRole | null> {
    return prisma.user.findUnique({ where: { id }, ...withRole });
  },

  /** Deliberately separate from the general lookups above - credentials
   * should only ever be fetched by flows that are about to verify/rotate
   * a password, not joined onto every generic user read. */
  async getPasswordCredentials(userId: number): Promise<PasswordCredentials | null> {
    return prisma.userMeta.findUnique({
      where: { userId },
      select: { passwordHash: true, passwordSalt: true },
    });
  },

  async createPendingUser(input: CreateUserInput): Promise<UserWithRole> {
    const role = await prisma.role.findUnique({ where: { name: DEFAULT_USER_ROLE_NAME } });
    if (!role) {
      throw new AppError(
        `Default role "${DEFAULT_USER_ROLE_NAME}" is not seeded. Run "npm run prisma:seed".`,
        500,
      );
    }

    return prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        roleId: role.id,
        meta: {
          create: {
            passwordHash: input.passwordHash,
            passwordSalt: input.passwordSalt,
          },
        },
      },
      ...withRole,
    });
  },

  async updatePendingUser(userId: number, input: UpdatePendingUserInput): Promise<UserWithRole> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        meta: {
          update: {
            passwordHash: input.passwordHash,
            passwordSalt: input.passwordSalt,
          },
        },
      },
      ...withRole,
    });
  },

  async markEmailVerified(userId: number): Promise<UserWithRole> {
    return prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true, status: Status.Active },
      ...withRole,
    });
  },

  async markProfileCreated(publicId: string): Promise<void> {
    await prisma.user.update({
      where: { publicId },
      data: { isProfileCreated: true },
    });
  },

  async updatePassword(userId: number, credentials: PasswordCredentials): Promise<void> {
    await prisma.userMeta.update({ where: { userId }, data: credentials });
  },

  async recordSuccessfulLogin(userId: number, ip?: string | undefined): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), lastLoginIp: ip, failedLoginAttempts: 0, lockedUntil: null },
    });
  },

  async recordFailedLogin(userId: number): Promise<FailedLoginResult> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });

    if (user.failedLoginAttempts >= securityConfig.lockout.threshold) {
      const lockedUntil = new Date(Date.now() + securityConfig.lockout.durationMinutes * 60 * 1000);
      await prisma.user.update({ where: { id: userId }, data: { lockedUntil } });
      return { failedLoginAttempts: user.failedLoginAttempts, lockedUntil };
    }

    return { failedLoginAttempts: user.failedLoginAttempts, lockedUntil: null };
  },

  async resetFailedLoginAttempts(userId: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  },
};

export default authRepository;
