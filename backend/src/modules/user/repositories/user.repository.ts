import type { AuditAction, Prisma, User } from "@prisma/client";
import { prisma } from "@/shared/config/db.conf.js";
import type { RequestContext } from "@/modules/user/types/user.types.js";

export type UserWithRole = User & { role: { name: string } };

export interface UpdateProfileData {
  firstName?: string | undefined;
  lastName?: string | undefined;
  phone?: string | null | undefined;
  profileImage?: string | null | undefined;
  bio?: string | null | undefined;
}

export interface ListUsersFilter {
  page: number;
  limit: number;
  search?: string | undefined;
}

export interface ListUsersResult {
  items: UserWithRole[];
  total: number;
}

export interface WriteAuditLogInput {
  userId: number;
  action: AuditAction;
  context?: RequestContext;
  metadata?: Record<string, unknown>;
}

const withRole = { include: { role: true } } as const;

export const userRepository = {
  async findByPublicId(publicId: string): Promise<UserWithRole | null> {
    return prisma.user.findUnique({ where: { publicId }, ...withRole });
  },

  async updateProfile(userId: number, data: UpdateProfileData): Promise<UserWithRole> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        profileImage: data.profileImage,
        bio: data.bio,
      },
      ...withRole,
    });
  },

  async list(filter: ListUsersFilter): Promise<ListUsersResult> {
    const where: Prisma.UserWhereInput = filter.search
      ? {
          OR: [
            { email: { contains: filter.search, mode: "insensitive" } },
            { firstName: { contains: filter.search, mode: "insensitive" } },
            { lastName: { contains: filter.search, mode: "insensitive" } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        ...withRole,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  },

  async writeAuditLog(entry: WriteAuditLogInput): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        ipAddress: entry.context?.ipAddress,
        userAgent: entry.context?.userAgent,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  },
};

export default userRepository;
