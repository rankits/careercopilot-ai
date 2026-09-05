import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: { auditLog: { create: vi.fn(async () => ({})) } },
  default: { auditLog: { create: vi.fn(async () => ({})) } },
  connectDatabase: vi.fn(async () => {}),
  disconnectDatabase: vi.fn(async () => {}),
}));

import { AuditService } from '@/shared/audit/audit.service.js';
import { prisma } from '@/shared/config/db.conf.js';

const createMock = vi.mocked(prisma.auditLog.create);

describe('AuditService.write', () => {
  beforeEach(() => {
    createMock.mockClear();
  });

  it('writes an audit log with explicit ids, context and metadata', async () => {
    await AuditService.write({
      adminId: 7,
      action: 'ADMIN_LOGIN' as never,
      context: { ipAddress: '10.0.0.1', userAgent: 'curl/8' },
      metadata: { reason: 'rotation' },
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][0]).toEqual({
      data: {
        adminId: 7,
        userId: null,
        action: 'ADMIN_LOGIN',
        ipAddress: '10.0.0.1',
        userAgent: 'curl/8',
        metadata: { reason: 'rotation' },
      },
    });
  });

  it('writes an audit log for a user with undefined fields normalized to null/undefined', async () => {
    await AuditService.write({ userId: 42, action: 'USER_LOGOUT' as never });

    expect(createMock.mock.calls[0][0]).toEqual({
      data: {
        adminId: null,
        userId: 42,
        action: 'USER_LOGOUT',
        ipAddress: undefined,
        userAgent: undefined,
        metadata: undefined,
      },
    });
  });

  it('writes an audit log with a userId when adminId is null', async () => {
    await AuditService.write({ adminId: null, userId: 1, action: 'SIGNIN' as never });
    expect(createMock.mock.calls[0][0].data.adminId).toBeNull();
    expect(createMock.mock.calls[0][0].data.userId).toBe(1);
  });
});
