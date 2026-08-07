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
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  profileImage: string | null;
  bio: string | null;
  googleSub: string | null;
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

export interface FakeGoogleLoginTransaction {
  id: string;
  stateHash: string;
  pkceVerifierEncrypted: string;
  returnPath: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
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

export interface FakeResume {
  id: string;
  userId: string | null;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  fileUrl: string;
  storageKey: string;
  storageDriver: 'LOCAL' | 'S3';
  status: 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  failureReason: string | null;
  uploadedAt: Date;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeResumeExtraction {
  id: string;
  resumeId: string;
  parseRunId: string | null;
  extractedText: string | null;
  extractedData: unknown;
  parserVersion: string;
  confidenceScore: number | null;
  createdAt: Date;
}

export interface FakeConnectedAccount {
  id: number;
  userId: number;
  provider: 'GOOGLE';
  providerAccountId: string;
  emailAddress: string | null;
  encryptedRefreshToken: string | null;
  encryptedAccessToken: string | null;
  credentialKeyId: string;
  scopes: string[];
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  lastTokenRefreshAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeOAuthTransaction {
  id: string;
  userId: number;
  sessionId: string;
  provider: 'GOOGLE';
  stateHash: string;
  pkceVerifierEncrypted: string;
  returnPath: string | null;
  requestedScopes: string[];
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface FakeApplicationSource {
  id: string;
  applicationId: string;
  sourceType: string;
  externalId: string | null;
  externalUrl: string | null;
}

export interface FakeApplicationStatusHistory {
  id: string;
  applicationId: string;
  fromStatus: string | null;
  toStatus: string;
  changedAt: Date;
  changedBy: string;
  note: string | null;
}

export interface FakeApplicationNote {
  id: string;
  applicationId: string;
  type: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeApplicationTask {
  id: string;
  applicationId: string;
  title: string;
  description: string | null;
  type: string;
  dueAt: Date | null;
  completedAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeApplication {
  id: string;
  userId: string;
  jobId: string | null;
  companyId: string | null;
  jobTitle: string;
  companyName: string;
  companyLogoUrl: string | null;
  originalJobUrl: string | null;
  normalisedJobUrl: string | null;
  descriptionSnapshot: string | null;
  skillsSnapshot: string[];
  location: string | null;
  remoteType: string | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  currentStatus: string;
  primarySourceType: string;
  priority: string;
  interestLevel: number | null;
  appliedAt: Date | null;
  firstResponseAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface FakeJob {
  id: string;
  title: string;
  companyId: string | null;
  companySlug: string | null;
  company: { id: string; name: string; logoUrl: string | null } | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  descriptionText: string | null;
  descriptionHtml: string | null;
  skills: string[];
}

const appWhereMatches = (app: FakeApplication, where?: Record<string, unknown>): boolean => {
  if (!where) return true;
  if (where.id !== undefined && app.id !== (where.id as string)) return false;
  if (where.userId !== undefined && app.userId !== (where.userId as string)) return false;
  if (where.jobId !== undefined) {
    if (typeof where.jobId === 'string' && app.jobId !== where.jobId) return false;
    if (typeof where.jobId === 'object' && where.jobId !== null && 'in' in where.jobId) {
      const inArray = (where.jobId as { in: string[] }).in;
      if (app.jobId === null || !inArray.includes(app.jobId)) return false;
    }
  }
  if (
    where.normalisedJobUrl !== undefined &&
    app.normalisedJobUrl !== (where.normalisedJobUrl as string)
  ) {
    return false;
  }

  const status = where.currentStatus as string | { in?: string[]; not?: string } | undefined;
  if (status !== undefined) {
    if (typeof status === 'string') {
      if (app.currentStatus !== status) return false;
    } else if (status && 'in' in status) {
      if (!status.in?.includes(app.currentStatus)) return false;
    } else if (status && 'not' in status) {
      if (app.currentStatus === status.not) return false;
    }
  }

  const archived = where.archivedAt as null | { not: null } | undefined;
  if (archived !== undefined) {
    if (archived === null && app.archivedAt !== null) return false;
    if (archived && 'not' in archived && app.archivedAt === null) return false;
  }

  const or = where.OR as Array<Record<string, { contains?: string }>> | undefined;
  if (or) {
    const text = `${app.companyName ?? ''} ${app.jobTitle ?? ''}`.toLowerCase();
    const ok = or.some((cond) => {
      const entry = Object.values(cond)[0] as { contains?: string } | undefined;
      return entry?.contains ? text.includes(entry.contains.toLowerCase()) : true;
    });
    if (!ok) return false;
  }

  return true;
};

const hydrateApplication = (
  db: Pick<FakeDb, 'applicationStatusHistories' | 'applicationNotes' | 'applicationTasks'>,
  app: FakeApplication,
  include?: Record<string, unknown>,
): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...app };
  if (!include) return out;
  if (include.statusHistory) {
    out.statusHistory = db.applicationStatusHistories
      .filter((h) => h.applicationId === app.id)
      .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime())
      .map((h) => ({ ...h }));
  }
  if (include.notes) {
    out.notes = db.applicationNotes
      .filter((n) => n.applicationId === app.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((n) => ({ ...n }));
  }
  if (include.tasks) {
    out.tasks = db.applicationTasks
      .filter((t) => t.applicationId === app.id)
      .sort(
        (a, b) =>
          String(a.status).localeCompare(String(b.status)) ||
          (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0),
      )
      .map((t) => ({ ...t }));
  }
  return out;
};

const sortApplications = (
  apps: FakeApplication[],
  orderBy?: Record<string, unknown> | Array<Record<string, unknown>>,
): FakeApplication[] => {
  if (!orderBy) return [...apps];
  const entries: Array<Record<string, unknown>> = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...apps].sort((a, b) => {
    for (const ob of entries) {
      const [key, dir] = Object.entries(ob)[0] as [string, 'asc' | 'desc'];
      const av = (a as unknown as Record<string, unknown>)[key];
      const bv = (b as unknown as Record<string, unknown>)[key];
      let cmp = 0;
      if (av instanceof Date && bv instanceof Date) {
        cmp = av.getTime() - bv.getTime();
      } else {
        cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      }
      if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
};

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
  resumes: FakeResume[] = [];
  resumeExtractions: FakeResumeExtraction[] = [];
  admins: FakeAdmin[] = [];
  adminMetas: FakeAdminMeta[] = [];
  adminSessions: FakeAdminSession[] = [];
  otps: FakeOtp[] = [];
  auditLogs: FakeAuditLog[] = [];
  connectedAccounts: FakeConnectedAccount[] = [];
  oAuthTransactions: FakeOAuthTransaction[] = [];
  googleLoginTransactions: FakeGoogleLoginTransaction[] = [];
  applications: FakeApplication[] = [];
  applicationSources: FakeApplicationSource[] = [];
  applicationStatusHistories: FakeApplicationStatusHistory[] = [];
  applicationNotes: FakeApplicationNote[] = [];
  applicationTasks: FakeApplicationTask[] = [];
  jobs: FakeJob[] = [];

  reset(): void {
    this.users = [];
    this.userMetas = [];
    this.userSessions = [];
    this.candidateProfiles = [];
    this.resumes = [];
    this.resumeExtractions = [];
    this.admins = [];
    this.adminMetas = [];
    this.adminSessions = [];
    this.otps = [];
    this.auditLogs = [];
    this.connectedAccounts = [];
    this.oAuthTransactions = [];
    this.googleLoginTransactions = [];
    this.applications = [];
    this.applicationSources = [];
    this.applicationStatusHistories = [];
    this.applicationNotes = [];
    this.applicationTasks = [];
    this.jobs = [];
    this.setRolePermissions('USER', ROLE_PERMISSION_MAP.USER);
    this.setRolePermissions('ADMIN', ROLE_PERMISSION_MAP.ADMIN);
  }

  seedApplication(overrides: Partial<FakeApplication> & { userId: string }): FakeApplication {
    const now = new Date();
    const app: FakeApplication = {
      id: randomUUID(),
      jobId: null,
      companyId: null,
      jobTitle: 'Backend Engineer',
      companyName: 'Acme Corp',
      companyLogoUrl: null,
      originalJobUrl: null,
      normalisedJobUrl: null,
      descriptionSnapshot: null,
      skillsSnapshot: [],
      location: null,
      remoteType: null,
      employmentType: null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: 'YEAR',
      currentStatus: 'SAVED',
      primarySourceType: 'MANUAL',
      priority: 'MEDIUM',
      interestLevel: null,
      appliedAt: null,
      firstResponseAt: null,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      ...overrides,
    };
    this.applications.push(app);
    return app;
  }

  seedJob(overrides: Partial<FakeJob> & { id: string }): FakeJob {
    const job: FakeJob = {
      title: 'Backend Engineer',
      companyId: null,
      companySlug: null,
      company: null,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      descriptionText: null,
      descriptionHtml: null,
      skills: [],
      ...overrides,
    };
    this.jobs.push(job);
    return job;
  }

  seedUser(
    overrides: Partial<FakeUser> & { passwordHash: string; passwordSalt: string },
  ): FakeUser {
    const now = new Date();
    const user: FakeUser = {
      id: allocId(),
      firstName: 'Jane',
      lastName: 'Doe',
      email: `user${Date.now()}${Math.random()}@example.com`,
      phone: null,
      profileImage: null,
      bio: null,
      googleSub: null,
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
          where: { id?: number; email?: string; googleSub?: string };
          select?: Record<string, boolean>;
          include?: { role?: boolean };
        }) => {
          const found = db.users.find(
            (u) =>
              (where.id !== undefined && u.id === where.id) ||
              (where.email !== undefined && u.email === where.email) ||
              (where.googleSub !== undefined && u.googleSub === where.googleSub),
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
            phone: null,
            profileImage: null,
            bio: null,
            googleSub: null,
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
          where: { id?: number };
          data: Record<string, unknown> & {
            meta?: { create?: FakeUserMeta; update?: Partial<FakeUserMeta> };
          };
          select?: Record<string, boolean>;
          include?: { role?: boolean };
        }) => {
          const index = db.users.findIndex((u) => where.id !== undefined && u.id === where.id);
          if (index === -1) {
            throw new Error(`FakeDb: user ${where.id ?? 'unknown'} not found`);
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
        update: async ({
          where,
          data,
        }: {
          where: { userId: string };
          data: Partial<FakeCandidateProfile>;
        }) => {
          const index = db.candidateProfiles.findIndex((p) => p.userId === where.userId);
          if (index === -1) throw new Error(`FakeDb: candidateProfile ${where.userId} not found`);
          db.candidateProfiles[index] = applyIncrements(
            db.candidateProfiles[index] as unknown as Record<string, unknown>,
            data as Record<string, unknown>,
          ) as unknown as FakeCandidateProfile;
          return { ...db.candidateProfiles[index] };
        },
        upsert: async ({
          where,
          create,
          update,
        }: {
          where: { userId: string };
          create: Omit<FakeCandidateProfile, 'id' | 'createdAt' | 'updatedAt'>;
          update: Partial<FakeCandidateProfile>;
        }) => {
          const now = new Date();
          const index = db.candidateProfiles.findIndex((p) => p.userId === where.userId);
          if (index === -1) {
            const record: FakeCandidateProfile = {
              id: randomUUID(),
              createdAt: now,
              updatedAt: now,
              ...create,
            };
            db.candidateProfiles.push(record);
            return { ...record };
          }
          db.candidateProfiles[index] = {
            ...db.candidateProfiles[index],
            ...update,
            updatedAt: now,
          };
          return { ...db.candidateProfiles[index] };
        },
      },

      resume: {
        findUnique: async ({ where }: { where: { id: string } }) => {
          const found = db.resumes.find((resume) => resume.id === where.id);
          return found ? { ...found } : null;
        },
        create: async ({
          data,
        }: {
          data: Omit<
            FakeResume,
            'status' | 'failureReason' | 'uploadedAt' | 'processedAt' | 'createdAt' | 'updatedAt'
          >;
        }) => {
          const now = new Date();
          const resume: FakeResume = {
            status: 'UPLOADED',
            failureReason: null,
            uploadedAt: now,
            processedAt: null,
            createdAt: now,
            updatedAt: now,
            ...data,
          };
          db.resumes.push(resume);
          return { ...resume };
        },
      },

      resumeExtraction: {
        findFirst: async ({ where }: { where: { resumeId: string } }) => {
          const matches = db.resumeExtractions
            .filter((extraction) => extraction.resumeId === where.resumeId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          return matches[0] ? { ...matches[0] } : null;
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
          where: { id?: number; email?: string };
          select?: Record<string, boolean>;
          include?: { role?: boolean };
        }) => {
          const found = db.admins.find(
            (a) =>
              (where.id !== undefined && a.id === where.id) ||
              (where.email !== undefined && a.email === where.email),
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

      connectedAccount: {
        findUnique: async ({ where }: { where: { id: number } }) => {
          const found = db.connectedAccounts.find((a) => a.id === where.id);
          return found ? { ...found } : null;
        },
        findFirst: async ({ where }: { where: { userId?: number; provider?: string } }) => {
          const found = db.connectedAccounts.find(
            (a) =>
              (where.userId === undefined || a.userId === where.userId) &&
              (where.provider === undefined || a.provider === where.provider),
          );
          return found ? { ...found } : null;
        },
        findMany: async ({ where }: { where: { userId?: number; provider?: string } }) => {
          return db.connectedAccounts
            .filter(
              (a) =>
                (where.userId === undefined || a.userId === where.userId) &&
                (where.provider === undefined || a.provider === where.provider),
            )
            .map((a) => ({ ...a }));
        },
        create: async ({
          data,
        }: {
          data: Omit<FakeConnectedAccount, 'id' | 'createdAt' | 'updatedAt'>;
        }) => {
          const account: FakeConnectedAccount = {
            id: allocId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          } as FakeConnectedAccount;
          db.connectedAccounts.push(account);
          return { ...account };
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: number };
          data: Partial<FakeConnectedAccount>;
        }) => {
          const index = db.connectedAccounts.findIndex((a) => a.id === where.id);
          if (index === -1) throw new Error(`FakeDb: connectedAccount ${where.id} not found`);
          db.connectedAccounts[index] = {
            ...db.connectedAccounts[index],
            ...data,
            updatedAt: new Date(),
          } as FakeConnectedAccount;
          return { ...db.connectedAccounts[index] };
        },
        deleteMany: async () => {
          db.connectedAccounts = [];
          return { count: db.connectedAccounts.length };
        },
      },

      oAuthTransaction: {
        findUnique: async ({ where }: { where: { id?: string; stateHash?: string } }) => {
          let found;
          if (where.id) {
            found = db.oAuthTransactions.find((t) => t.id === where.id);
          } else if (where.stateHash) {
            found = db.oAuthTransactions.find((t) => t.stateHash === where.stateHash);
          }
          return found ? { ...found } : null;
        },
        findFirst: async ({ where }: { where: { userId?: number; sessionId?: string } }) => {
          const found = db.oAuthTransactions.find(
            (t) =>
              (where.userId === undefined || t.userId === where.userId) &&
              (where.sessionId === undefined || t.sessionId === where.sessionId),
          );
          return found ? { ...found } : null;
        },
        create: async ({ data }: { data: Omit<FakeOAuthTransaction, 'id' | 'createdAt'> }) => {
          const tx: FakeOAuthTransaction = {
            id: randomUUID(),
            createdAt: new Date(),
            ...data,
          } as FakeOAuthTransaction;
          db.oAuthTransactions.push(tx);
          return { ...tx };
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<FakeOAuthTransaction>;
        }) => {
          const index = db.oAuthTransactions.findIndex((t) => t.id === where.id);
          if (index === -1) throw new Error(`FakeDb: oAuthTransaction ${where.id} not found`);
          db.oAuthTransactions[index] = {
            ...db.oAuthTransactions[index],
            ...data,
          } as FakeOAuthTransaction;
          return { ...db.oAuthTransactions[index] };
        },
        deleteMany: async () => {
          db.oAuthTransactions = [];
          return { count: db.oAuthTransactions.length };
        },
      },

      googleLoginTransaction: {
        findUnique: async ({ where }: { where: { id?: string; stateHash?: string } }) => {
          let found;
          if (where.id) {
            found = db.googleLoginTransactions.find((t) => t.id === where.id);
          } else if (where.stateHash) {
            found = db.googleLoginTransactions.find((t) => t.stateHash === where.stateHash);
          }
          return found ? { ...found } : null;
        },
        create: async ({
          data,
        }: {
          data: Omit<FakeGoogleLoginTransaction, 'id' | 'createdAt' | 'consumedAt'> & {
            consumedAt?: Date | null;
          };
        }) => {
          const tx: FakeGoogleLoginTransaction = {
            id: randomUUID(),
            createdAt: new Date(),
            consumedAt: null,
            ...data,
          };
          db.googleLoginTransactions.push(tx);
          return { ...tx };
        },
        updateMany: async ({
          where,
          data,
        }: {
          where: { id?: string; consumedAt?: null };
          data: Partial<FakeGoogleLoginTransaction>;
        }) => {
          let count = 0;
          db.googleLoginTransactions = db.googleLoginTransactions.map((tx) => {
            const idMatch = where.id === undefined || tx.id === where.id;
            const consumedMatch =
              where.consumedAt === undefined ||
              (where.consumedAt === null && tx.consumedAt === null);
            if (idMatch && consumedMatch) {
              count += 1;
              return { ...tx, ...data };
            }
            return tx;
          });
          return { count };
        },
        deleteMany: async () => {
          const count = db.googleLoginTransactions.length;
          db.googleLoginTransactions = [];
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
        updateMany: async ({
          where,
          data,
        }: {
          where: { target: string; purpose: OtpPurpose };
          data: Partial<FakeOtp>;
        }) => {
          let count = 0;
          const now = new Date();
          for (let i = 0; i < db.otps.length; i++) {
            if (db.otps[i].target === where.target && db.otps[i].purpose === where.purpose) {
              db.otps[i] = { ...db.otps[i], ...data, updatedAt: now };
              count++;
            }
          }
          return { count };
        },
        deleteMany: async ({
          where,
        }: {
          where: { target: string; purpose: OtpPurpose };
        }) => {
          let count = 0;
          db.otps = db.otps.filter((o) => {
            const matches = o.target === where.target && o.purpose === where.purpose;
            if (matches) count++;
            return !matches;
          });
          return { count };
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
        findUnique: async ({ where }: { where: { id?: string } }) => {
          const job = db.jobs.find((j) => j.id === where.id);
          return job ? { ...job } : null;
        },
        findFirst: async () => null,
      },

      application: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const now = new Date();
          const app: FakeApplication = {
            id: (data.id as string) ?? randomUUID(),
            userId: data.userId as string,
            jobId: (data.jobId as string | null) ?? null,
            companyId: (data.companyId as string | null) ?? null,
            jobTitle: (data.jobTitle as string) ?? '',
            companyName: (data.companyName as string) ?? '',
            companyLogoUrl: (data.companyLogoUrl as string | null) ?? null,
            originalJobUrl: (data.originalJobUrl as string | null) ?? null,
            normalisedJobUrl: (data.normalisedJobUrl as string | null) ?? null,
            descriptionSnapshot: (data.descriptionSnapshot as string | null) ?? null,
            skillsSnapshot: Array.isArray(data.skillsSnapshot)
              ? (data.skillsSnapshot as string[])
              : [],
            location: (data.location as string | null) ?? null,
            remoteType: (data.remoteType as string | null) ?? null,
            employmentType: (data.employmentType as string | null) ?? null,
            salaryMin: (data.salaryMin as number | null) ?? null,
            salaryMax: (data.salaryMax as number | null) ?? null,
            salaryCurrency: (data.salaryCurrency as string | null) ?? null,
            salaryPeriod: (data.salaryPeriod as string | null) ?? null,
            currentStatus: (data.currentStatus as string) ?? 'SAVED',
            primarySourceType: (data.primarySourceType as string) ?? '',
            priority: (data.priority as string) ?? 'MEDIUM',
            interestLevel: (data.interestLevel as number | null) ?? null,
            appliedAt: (data.appliedAt as Date | null) ?? null,
            firstResponseAt: (data.firstResponseAt as Date | null) ?? null,
            closedAt: (data.closedAt as Date | null) ?? null,
            createdAt: now,
            updatedAt: now,
            archivedAt: (data.archivedAt as Date | null) ?? null,
          };
          db.applications.push(app);

          const sources = data.sources as { create?: Array<Record<string, unknown>> } | undefined;
          if (sources?.create) {
            for (const src of sources.create) {
              db.applicationSources.push({
                id: randomUUID(),
                applicationId: app.id,
                sourceType: src.sourceType as string,
                externalId: (src.externalId as string | null) ?? null,
                externalUrl: (src.externalUrl as string | null) ?? null,
              });
            }
          }

          const history = data.statusHistory as
            { create?: Array<Record<string, unknown>> } | undefined;
          if (history?.create) {
            for (const h of history.create) {
              db.applicationStatusHistories.push({
                id: randomUUID(),
                applicationId: app.id,
                fromStatus: (h.fromStatus as string | null) ?? null,
                toStatus: h.toStatus as string,
                changedAt: (h.changedAt as Date) ?? new Date(),
                changedBy: (h.changedBy as string) ?? 'USER',
                note: (h.note as string | null) ?? null,
              });
            }
          }

          return { ...app };
        },

        findFirst: async ({
          where,
          select,
          include,
        }: {
          where?: Record<string, unknown>;
          select?: Record<string, boolean>;
          include?: Record<string, unknown>;
        }) => {
          const found = db.applications.find((app) => appWhereMatches(app, where));
          if (!found) return null;
          const hydrated = hydrateApplication(db, found, include);
          return select ? project(hydrated, select) : hydrated;
        },

        findMany: async ({
          where,
          orderBy,
          skip = 0,
          take,
        }: {
          where?: Record<string, unknown>;
          orderBy?: Record<string, unknown> | Array<Record<string, unknown>>;
          skip?: number;
          take?: number;
        }) => {
          const items = sortApplications(
            db.applications.filter((app) => appWhereMatches(app, where)),
            orderBy,
          );
          const page = items.slice(skip, take !== undefined ? skip + take : undefined);
          return page.map((app) => hydrateApplication(db, app, undefined));
        },

        count: async ({ where }: { where?: Record<string, unknown> }) =>
          db.applications.filter((app) => appWhereMatches(app, where)).length,

        update: async ({
          where,
          data,
        }: {
          where: { id: string; userId?: string };
          data: Record<string, unknown>;
        }) => {
          const index = db.applications.findIndex((app) => appWhereMatches(app, where));
          if (index === -1) {
            throw new Error(`FakeDb: application ${where.id} not found`);
          }
          const updated = applyIncrements(
            db.applications[index] as unknown as Record<string, unknown>,
            data,
          ) as unknown as FakeApplication;
          db.applications[index] = updated;
          return { ...updated };
        },

        deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
          let count = 0;
          db.applications = db.applications.filter((app) => {
            const matches = appWhereMatches(app, where);
            if (matches) count++;
            return !matches;
          });
          return { count };
        },
      },

      applicationStatusHistory: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const history: FakeApplicationStatusHistory = {
            id: randomUUID(),
            applicationId: data.applicationId as string,
            fromStatus: (data.fromStatus as string | null) ?? null,
            toStatus: data.toStatus as string,
            changedAt: (data.changedAt as Date) ?? new Date(),
            changedBy: (data.changedBy as string) ?? 'USER',
            note: (data.note as string | null) ?? null,
          };
          db.applicationStatusHistories.push(history);
          return { ...history };
        },
      },

      applicationNote: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const now = new Date();
          const note: FakeApplicationNote = {
            id: randomUUID(),
            applicationId: data.applicationId as string,
            type: data.type as string,
            content: data.content as string,
            createdAt: now,
            updatedAt: now,
          };
          db.applicationNotes.push(note);
          return { ...note };
        },
        deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
          let count = 0;
          db.applicationNotes = db.applicationNotes.filter((note) => {
            const app = db.applications.find((a) => a.id === note.applicationId);
            const matches =
              (where.id === undefined || note.id === (where.id as string)) &&
              (where.applicationId === undefined ||
                note.applicationId === (where.applicationId as string)) &&
              (where.application === undefined ||
                app?.userId === (where.application as { userId: string }).userId);
            if (matches) count++;
            return !matches;
          });
          return { count };
        },
      },

      applicationTask: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const now = new Date();
          const task: FakeApplicationTask = {
            id: randomUUID(),
            applicationId: data.applicationId as string,
            title: data.title as string,
            description: (data.description as string | null) ?? null,
            type: data.type as string,
            dueAt: (data.dueAt as Date | null) ?? null,
            completedAt: (data.completedAt as Date | null) ?? null,
            status: (data.status as string) ?? 'PENDING',
            createdAt: now,
            updatedAt: now,
          };
          db.applicationTasks.push(task);
          return { ...task };
        },
        findFirst: async ({ where }: { where: Record<string, unknown> }) => {
          const found = db.applicationTasks.find((task) => {
            const app = db.applications.find((a) => a.id === task.applicationId);
            return (
              (where.id === undefined || task.id === (where.id as string)) &&
              (where.applicationId === undefined ||
                task.applicationId === (where.applicationId as string)) &&
              (where.application === undefined ||
                app?.userId === (where.application as { userId: string }).userId)
            );
          });
          return found ? { ...found } : null;
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const index = db.applicationTasks.findIndex((task) => task.id === where.id);
          if (index === -1) {
            throw new Error(`FakeDb: applicationTask ${where.id} not found`);
          }
          db.applicationTasks[index] = applyIncrements(
            db.applicationTasks[index] as unknown as Record<string, unknown>,
            data,
          ) as unknown as FakeApplicationTask;
          return { ...db.applicationTasks[index] };
        },
        deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
          let count = 0;
          db.applicationTasks = db.applicationTasks.filter((task) => {
            const app = db.applications.find((a) => a.id === task.applicationId);
            const matches =
              (where.id === undefined || task.id === (where.id as string)) &&
              (where.applicationId === undefined ||
                task.applicationId === (where.applicationId as string)) &&
              (where.application === undefined ||
                app?.userId === (where.application as { userId: string }).userId);
            if (matches) count++;
            return !matches;
          });
          return { count };
        },
      },

      $transaction: async (arg: unknown) => {
        const client = db.toPrismaClient();
        if (typeof arg === 'function') {
          return (arg as (tx: typeof client) => Promise<unknown>)(client);
        }
        throw new Error('FakeDb: only interactive $transaction callbacks are supported');
      },

      $queryRaw: async () => [{ '?column?': 1 }],
      $executeRaw: async () => 0,
    };
  }
}
