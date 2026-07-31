import { randomUUID } from 'node:crypto';
import { Status, type OtpPurpose, type OtpTransport } from '@prisma/client';
import { ROLE_PERMISSION_MAP, type SystemRole } from '@/shared/rbac/permission.catalog.js';

/**
 * A small, purpose-built in-memory stand-in for PrismaClient, covering
 * exactly the calls the auth/user/admin repositories make. This is
 * deliberately NOT a generic query engine - it hard-codes the handful of
 * `where`/`select`/`include`/`data` shapes this codebase actually uses, so
 * specs can seed realistic rows and exercise the real service/controller
 * code against them without a live Postgres instance.
 */

export interface FakeRole {
  id: number;
  name: string;
  /** Permission keys granted to this role - mirrors `RolePermission` rows,
   * seeded from the same `ROLE_PERMISSION_MAP` the real `prisma/seed/roles.seed.ts`
   * uses, so `PermissionCache`-driven specs see the actual production catalog. */
  permissions: string[];
}

export interface FakeUser {
  id: number;
  publicId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  profileImage: string | null;
  bio: string | null;
  status: Status;
  isEmailVerified: boolean;
  isProfileCreated: boolean;
  roleId: number;
  tokenVersion: number;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeUserMeta {
  userId: number;
  passwordHash: string;
  passwordSalt: string;
}

export interface FakeUserSession {
  id: number;
  userId: number;
  sessionId: string;
  familyId: string;
  rememberMe: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBySessionId: string | null;
  createdAt: Date;
}

export interface FakeAdmin {
  id: number;
  publicId: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage: string | null;
  status: Status;
  roleId: number;
  tokenVersion: number;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeAdminMeta {
  adminId: number;
  passwordHash: string;
  passwordSalt: string;
}

export interface FakeAdminSession {
  id: number;
  adminId: number;
  sessionId: string;
  familyId: string;
  rememberMe: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBySessionId: string | null;
  createdAt: Date;
}

export interface FakeOtp {
  id: number;
  code: string;
  purpose: OtpPurpose;
  transport: OtpTransport;
  target: string;
  attempt: number;
  retries: number;
  lastSentAt: Date;
  expiresAt: Date;
  lastCodeVerified: boolean;
  blocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeAuditLog {
  id: number;
  adminId: number | null;
  userId: number | null;
  action: string;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  metadata: unknown;
  createdAt: Date;
}

export interface FakeCandidateProfile {
  id: string;
  userId: string;
  personalDetails: unknown;
  experience: unknown;
  education: unknown;
  skills: unknown;
  certifications: unknown;
  sourceResumeId: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const withRole = <T extends { roleId: number }>(record: T, roles: Map<number, FakeRole>) => ({
  ...record,
  role: { name: roles.get(record.roleId)?.name ?? 'USER' },
});

const applyIncrements = (record: Record<string, unknown>, data: Record<string, unknown>) => {
  const next = { ...record };
  for (const [key, value] of Object.entries(data)) {
    // Matches real Prisma semantics: an `undefined` value in `data` means
    // "field not provided, leave it alone" - NOT "set it to undefined".
    // Repositories like user.repository.ts#updateProfile rely on this to
    // do partial updates by always passing every key, `undefined` for the
    // ones the caller didn't set.
    if (value === undefined) continue;
    if (value && typeof value === 'object' && 'increment' in (value as Record<string, unknown>)) {
      const current = (next[key] as number | undefined) ?? 0;
      next[key] = current + (value as { increment: number }).increment;
    } else if (key !== 'meta') {
      next[key] = value;
    }
  }
  if ('updatedAt' in next) next.updatedAt = new Date();
  return next;
};

const project = <T extends object>(record: T, select?: Record<string, boolean>) => {
  if (!select) return record;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(select)) {
    if (select[key]) out[key] = (record as Record<string, unknown>)[key];
  }
  return out;
};

let nextId = 1;
const allocId = () => nextId++;

export class FakeDb {
  roles = new Map<number, FakeRole>([
    [1, { id: 1, name: 'USER', permissions: ROLE_PERMISSION_MAP.USER }],
    [2, { id: 2, name: 'ADMIN', permissions: ROLE_PERMISSION_MAP.ADMIN }],
  ]);

  /** Test-only hook for permission-gate specs - e.g. `setRolePermissions('ADMIN', [])`
   * to assert a role stripped of a permission gets a 403 from `requirePermission`. */
  setRolePermissions(roleName: SystemRole, permissionKeys: string[]): void {
    for (const role of this.roles.values()) {
      if (role.name === roleName) {
        role.permissions = permissionKeys;
        return;
      }
    }
  }

  users: FakeUser[] = [];
  userMetas: FakeUserMeta[] = [];
  userSessions: FakeUserSession[] = [];
  candidateProfiles: FakeCandidateProfile[] = [];
  admins: FakeAdmin[] = [];
  adminMetas: FakeAdminMeta[] = [];
  adminSessions: FakeAdminSession[] = [];
  otps: FakeOtp[] = [];
  auditLogs: FakeAuditLog[] = [];

  reset(): void {
    this.users = [];
    this.userMetas = [];
    this.userSessions = [];
    this.candidateProfiles = [];
    this.admins = [];
    this.adminMetas = [];
    this.adminSessions = [];
    this.otps = [];
    this.auditLogs = [];
    this.setRolePermissions('USER', ROLE_PERMISSION_MAP.USER);
    this.setRolePermissions('ADMIN', ROLE_PERMISSION_MAP.ADMIN);
  }

  seedUser(
    overrides: Partial<FakeUser> & { passwordHash: string; passwordSalt: string },
  ): FakeUser {
    const now = new Date();
    const user: FakeUser = {
      id: allocId(),
      publicId: randomUUID(),
      firstName: 'Jane',
      lastName: 'Doe',
      email: `user${Date.now()}${Math.random()}@example.com`,
      phone: null,
      profileImage: null,
      bio: null,
      status: Status.Active,
      isEmailVerified: true,
      isProfileCreated: false,
      roleId: 1,
      tokenVersion: 0,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      lastLoginIp: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
    this.users.push(user);
    this.userMetas.push({
      userId: user.id,
      passwordHash: overrides.passwordHash,
      passwordSalt: overrides.passwordSalt,
    });
    return user;
  }

  seedAdmin(
    overrides: Partial<FakeAdmin> & { passwordHash: string; passwordSalt: string },
  ): FakeAdmin {
    const now = new Date();
    const admin: FakeAdmin = {
      id: allocId(),
      publicId: randomUUID(),
      firstName: 'Ada',
      lastName: 'Admin',
      email: `admin${Date.now()}${Math.random()}@example.com`,
      profileImage: null,
      status: Status.Active,
      roleId: 2,
      tokenVersion: 0,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      lastLoginIp: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
    this.admins.push(admin);
    this.adminMetas.push({
      adminId: admin.id,
      passwordHash: overrides.passwordHash,
      passwordSalt: overrides.passwordSalt,
    });
    return admin;
  }

  toPrismaClient() {
    const db = this;

    return {
      role: {
        findUnique: async ({
          where,
          include,
        }: {
          where: { name?: string };
          include?: { permissions?: { include?: { permission?: boolean } } };
        }) => {
          if (where.name === undefined) return null;
          for (const role of db.roles.values()) {
            if (role.name !== where.name) continue;
            const { permissions, ...rest } = role;
            if (!include?.permissions) return { ...rest };
            // Mirrors the real `RolePermission -> Permission` shape so
            // `PermissionCache#getPermissionsForRole` (which reads
            // `role.permissions.map((rp) => rp.permission.key)`) works
            // unchanged against this fake.
            return {
              ...rest,
              permissions: permissions.map((key) => ({ permission: { key } })),
            };
          }
          return null;
        },
      },

      user: {
        findUnique: async ({
          where,
          select,
          include,
        }: {
          where: { id?: number; email?: string; publicId?: string };
          select?: Record<string, boolean>;
          include?: { role?: boolean };
        }) => {
          const found = db.users.find(
            (u) =>
              (where.id !== undefined && u.id === where.id) ||
              (where.email !== undefined && u.email === where.email) ||
              (where.publicId !== undefined && u.publicId === where.publicId),
          );
          if (!found) return null;
          if (select) return project(found, select);
          if (include?.role) return withRole(found, db.roles);
          return { ...found };
        },

        create: async ({
          data,
          include,
        }: {
          data: Record<string, unknown> & {
            meta?: { create: { passwordHash: string; passwordSalt: string } };
          };
          include?: { role?: boolean };
        }) => {
          const now = new Date();
          const { meta, ...userData } = data;
          const user: FakeUser = {
            id: allocId(),
            publicId: randomUUID(),
            phone: null,
            profileImage: null,
            bio: null,
            status: Status.PendingVerification,
            isEmailVerified: false,
            isProfileCreated: false,
            tokenVersion: 0,
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: null,
            lastLoginIp: null,
            createdAt: now,
            updatedAt: now,
            ...(userData as Partial<FakeUser>),
          } as FakeUser;
          db.users.push(user);
          if (meta?.create) {
            db.userMetas.push({ userId: user.id, ...meta.create });
          }
          return include?.role ? withRole(user, db.roles) : { ...user };
        },

        update: async ({
          where,
          data,
          select,
          include,
        }: {
          where: { id?: number; publicId?: string };
          data: Record<string, unknown> & {
            meta?: { create?: FakeUserMeta; update?: Partial<FakeUserMeta> };
          };
          select?: Record<string, boolean>;
          include?: { role?: boolean };
        }) => {
          const index = db.users.findIndex((u) =>
            where.id !== undefined
              ? u.id === where.id
              : where.publicId !== undefined
                ? u.publicId === where.publicId
                : false,
          );
          if (index === -1) {
            throw new Error(`FakeDb: user ${where.id ?? where.publicId ?? 'unknown'} not found`);
          }
          const updated = applyIncrements(
            db.users[index] as unknown as Record<string, unknown>,
            data,
          ) as unknown as FakeUser;
          db.users[index] = updated;

          if (data.meta?.update && where.id !== undefined) {
            const metaIndex = db.userMetas.findIndex((m) => m.userId === where.id);
            if (metaIndex !== -1) {
              db.userMetas[metaIndex] = { ...db.userMetas[metaIndex], ...data.meta.update };
            }
          }

          if (select) return project(updated as unknown as Record<string, unknown>, select);
          if (include?.role) return withRole(updated, db.roles);
          return { ...updated };
        },

        findMany: async ({
          where,
          orderBy,
          skip = 0,
          take,
          include,
        }: {
          where?: { OR?: Array<Record<string, { contains?: string }>> };
          orderBy?: { createdAt: 'asc' | 'desc' };
          skip?: number;
          take?: number;
          include?: { role?: boolean };
        }) => {
          let items = [...db.users];

          const search = where?.OR?.[0]
            ? Object.values(where.OR[0])[0]?.contains?.toLowerCase()
            : undefined;
          if (search) {
            items = items.filter(
              (u) =>
                u.email.toLowerCase().includes(search) ||
                u.firstName.toLowerCase().includes(search) ||
                u.lastName.toLowerCase().includes(search),
            );
          }

          items.sort((a, b) =>
            orderBy?.createdAt === 'asc'
              ? a.createdAt.getTime() - b.createdAt.getTime()
              : b.createdAt.getTime() - a.createdAt.getTime(),
          );

          const page = items.slice(skip, take !== undefined ? skip + take : undefined);
          return include?.role ? page.map((u) => withRole(u, db.roles)) : page;
        },

        count: async ({ where }: { where?: { status?: Status } } = {}) => {
          if (where?.status !== undefined) {
            return db.users.filter((u) => u.status === where.status).length;
          }
          return db.users.length;
        },
      },

      userMeta: {
        findUnique: async ({
          where,
          select,
        }: {
          where: { userId: number };
          select?: Record<string, boolean>;
        }) => {
          const found = db.userMetas.find((m) => m.userId === where.userId);
          if (!found) return null;
          return select ? project(found, select) : { ...found };
        },
        update: async ({
          where,
          data,
        }: {
          where: { userId: number };
          data: Partial<FakeUserMeta>;
        }) => {
          const index = db.userMetas.findIndex((m) => m.userId === where.userId);
          if (index === -1) throw new Error(`FakeDb: userMeta ${where.userId} not found`);
          db.userMetas[index] = { ...db.userMetas[index], ...data };
          return { ...db.userMetas[index] };
        },
      },

      candidateProfile: {
        findUnique: async ({ where }: { where: { userId: string } }) => {
          const found = db.candidateProfiles.find((profile) => profile.userId === where.userId);
          return found ? { ...found } : null;
        },
      },

      userSession: {
        create: async ({
          data,
        }: {
          data: Omit<FakeUserSession, 'id' | 'createdAt' | 'revokedAt' | 'replacedBySessionId'>;
        }) => {
          const session: FakeUserSession = {
            id: allocId(),
            createdAt: new Date(),
            revokedAt: null,
            replacedBySessionId: null,
            ...data,
          };
          db.userSessions.push(session);
          return { ...session };
        },
        findUnique: async ({
          where,
          select,
        }: {
          where: { sessionId: number | string };
          select?: Record<string, boolean>;
        }) => {
          const found = db.userSessions.find((s) => s.sessionId === where.sessionId);
          if (!found) return null;
          return select ? project(found, select) : { ...found };
        },
        findMany: async ({
          where,
        }: {
          where: { userId: number; revokedAt: null; expiresAt: { gt: Date } };
        }) => {
          return db.userSessions
            .filter(
              (s) =>
                s.userId === where.userId &&
                s.revokedAt === null &&
                s.expiresAt.getTime() > where.expiresAt.gt.getTime(),
            )
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map((s) => ({ id: s.id }));
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: number };
          data: Partial<FakeUserSession>;
        }) => {
          const index = db.userSessions.findIndex((s) => s.id === where.id);
          if (index === -1) throw new Error(`FakeDb: userSession ${where.id} not found`);
          db.userSessions[index] = { ...db.userSessions[index], ...data };
          return { ...db.userSessions[index] };
        },
        updateMany: async ({
          where,
          data,
        }: {
          where: { id?: { in: number[] }; userId?: number; familyId?: string; revokedAt?: null };
          data: Partial<FakeUserSession>;
        }) => {
          let count = 0;
          db.userSessions = db.userSessions.map((s) => {
            const matches =
              (where.id === undefined || where.id.in.includes(s.id)) &&
              (where.userId === undefined || s.userId === where.userId) &&
              (where.familyId === undefined || s.familyId === where.familyId) &&
              (where.revokedAt === undefined || s.revokedAt === where.revokedAt);
            if (matches) {
              count++;
              return { ...s, ...data };
            }
            return s;
          });
          return { count };
        },
      },

      admin: {
        findUnique: async ({
          where,
          select,
          include,
        }: {
          where: { id?: number; email?: string; publicId?: string };
          select?: Record<string, boolean>;
          include?: { role?: boolean };
        }) => {
          const found = db.admins.find(
            (a) =>
              (where.id !== undefined && a.id === where.id) ||
              (where.email !== undefined && a.email === where.email) ||
              (where.publicId !== undefined && a.publicId === where.publicId),
          );
          if (!found) return null;
          if (select) return project(found, select);
          if (include?.role) return withRole(found, db.roles);
          return { ...found };
        },
        update: async ({
          where,
          data,
          select,
          include,
        }: {
          where: { id: number };
          data: Record<string, unknown>;
          select?: Record<string, boolean>;
          include?: { role?: boolean };
        }) => {
          const index = db.admins.findIndex((a) => a.id === where.id);
          if (index === -1) throw new Error(`FakeDb: admin ${where.id} not found`);
          const updated = applyIncrements(
            db.admins[index] as unknown as Record<string, unknown>,
            data,
          ) as unknown as FakeAdmin;
          db.admins[index] = updated;
          if (select) return project(updated as unknown as Record<string, unknown>, select);
          if (include?.role) return withRole(updated, db.roles);
          return { ...updated };
        },
        count: async () => db.admins.length,
      },

      adminMeta: {
        findUnique: async ({
          where,
          select,
        }: {
          where: { adminId: number };
          select?: Record<string, boolean>;
        }) => {
          const found = db.adminMetas.find((m) => m.adminId === where.adminId);
          if (!found) return null;
          return select ? project(found, select) : { ...found };
        },
        update: async ({
          where,
          data,
        }: {
          where: { adminId: number };
          data: Partial<FakeAdminMeta>;
        }) => {
          const index = db.adminMetas.findIndex((m) => m.adminId === where.adminId);
          if (index === -1) throw new Error(`FakeDb: adminMeta ${where.adminId} not found`);
          db.adminMetas[index] = { ...db.adminMetas[index], ...data };
          return { ...db.adminMetas[index] };
        },
      },

      adminSession: {
        create: async ({
          data,
        }: {
          data: Omit<FakeAdminSession, 'id' | 'createdAt' | 'revokedAt' | 'replacedBySessionId'>;
        }) => {
          const session: FakeAdminSession = {
            id: allocId(),
            createdAt: new Date(),
            revokedAt: null,
            replacedBySessionId: null,
            ...data,
          };
          db.adminSessions.push(session);
          return { ...session };
        },
        findUnique: async ({
          where,
          select,
        }: {
          where: { sessionId: number | string };
          select?: Record<string, boolean>;
        }) => {
          const found = db.adminSessions.find((s) => s.sessionId === where.sessionId);
          if (!found) return null;
          return select ? project(found, select) : { ...found };
        },
        findMany: async ({
          where,
        }: {
          where: { adminId: number; revokedAt: null; expiresAt: { gt: Date } };
        }) => {
          return db.adminSessions
            .filter(
              (s) =>
                s.adminId === where.adminId &&
                s.revokedAt === null &&
                s.expiresAt.getTime() > where.expiresAt.gt.getTime(),
            )
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map((s) => ({ id: s.id }));
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: number };
          data: Partial<FakeAdminSession>;
        }) => {
          const index = db.adminSessions.findIndex((s) => s.id === where.id);
          if (index === -1) throw new Error(`FakeDb: adminSession ${where.id} not found`);
          db.adminSessions[index] = { ...db.adminSessions[index], ...data };
          return { ...db.adminSessions[index] };
        },
        updateMany: async ({
          where,
          data,
        }: {
          where: { id?: { in: number[] }; adminId?: number; familyId?: string; revokedAt?: null };
          data: Partial<FakeAdminSession>;
        }) => {
          let count = 0;
          db.adminSessions = db.adminSessions.map((s) => {
            const matches =
              (where.id === undefined || where.id.in.includes(s.id)) &&
              (where.adminId === undefined || s.adminId === where.adminId) &&
              (where.familyId === undefined || s.familyId === where.familyId) &&
              (where.revokedAt === undefined || s.revokedAt === where.revokedAt);
            if (matches) {
              count++;
              return { ...s, ...data };
            }
            return s;
          });
          return { count };
        },
      },

      otp: {
        findUnique: async ({
          where,
        }: {
          where: {
            transport_target_purpose: {
              transport: OtpTransport;
              target: string;
              purpose: OtpPurpose;
            };
          };
        }) => {
          const { transport, target, purpose } = where.transport_target_purpose;
          const found = db.otps.find(
            (o) => o.transport === transport && o.target === target && o.purpose === purpose,
          );
          return found ? { ...found } : null;
        },
        upsert: async ({
          where,
          create,
          update,
        }: {
          where: {
            transport_target_purpose: {
              transport: OtpTransport;
              target: string;
              purpose: OtpPurpose;
            };
          };
          create: Omit<FakeOtp, 'id' | 'createdAt' | 'updatedAt'>;
          update: Partial<FakeOtp>;
        }) => {
          const { transport, target, purpose } = where.transport_target_purpose;
          const index = db.otps.findIndex(
            (o) => o.transport === transport && o.target === target && o.purpose === purpose,
          );
          const now = new Date();
          if (index === -1) {
            const record: FakeOtp = { id: allocId(), createdAt: now, updatedAt: now, ...create };
            db.otps.push(record);
            return { ...record };
          }
          db.otps[index] = { ...db.otps[index], ...update, updatedAt: now };
          return { ...db.otps[index] };
        },
        update: async ({ where, data }: { where: { id: number }; data: Partial<FakeOtp> }) => {
          const index = db.otps.findIndex((o) => o.id === where.id);
          if (index === -1) throw new Error(`FakeDb: otp ${where.id} not found`);
          const current = db.otps[index];
          const merged = applyIncrements(
            current as unknown as Record<string, unknown>,
            data,
          ) as unknown as FakeOtp;
          db.otps[index] = merged;
          return { ...merged };
        },
      },

      auditLog: {
        create: async ({ data }: { data: Omit<FakeAuditLog, 'id' | 'createdAt'> }) => {
          const record: FakeAuditLog = { id: allocId(), createdAt: new Date(), ...data };
          db.auditLogs.push(record);
          return { ...record };
        },
      },

      // Minimal recommendation surfaces so list/detail smoke tests can hit the
      // Prisma UoW against FakeDb without a live Postgres. Writes for generate
      // are not fully modeled here.
      recommendationRun: {
        findFirst: async () => null,
        create: async () => {
          throw new Error('FakeDb: recommendationRun.create is not implemented');
        },
        updateMany: async () => ({ count: 0 }),
      },
      jobRecommendation: {
        findFirst: async () => null,
        findMany: async () => [],
        count: async () => 0,
        create: async () => {
          throw new Error('FakeDb: jobRecommendation.create is not implemented');
        },
      },
      recommendationFeedback: {
        findFirst: async () => null,
        findMany: async () => [],
        upsert: async () => {
          throw new Error('FakeDb: recommendationFeedback.upsert is not implemented');
        },
      },
      job: {
        findMany: async () => [],
        findUnique: async () => null,
      },

      $transaction: async (arg: unknown) => {
        const client = db.toPrismaClient();
        if (typeof arg === 'function') {
          return (arg as (tx: typeof client) => Promise<unknown>)(client);
        }
        throw new Error('FakeDb: only interactive $transaction callbacks are supported');
      },

      $queryRaw: async () => [{ '?column?': 1 }],
    };
  }
}
