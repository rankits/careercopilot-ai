import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

const {
  seedPermissionsMock,
  seedRolesMock,
  seedDefaultAdminMock,
  seedSkillAliasesMock,
  disconnectMock,
  MockPrismaClient,
} = vi.hoisted(() => {
  const disconnectMock = vi.fn(async () => {});
  class MockPrismaClient {
    $disconnect = disconnectMock;
  }
  return {
    seedPermissionsMock: vi.fn(),
    seedRolesMock: vi.fn(),
    seedDefaultAdminMock: vi.fn(),
    seedSkillAliasesMock: vi.fn(),
    disconnectMock,
    MockPrismaClient,
  };
});

vi.mock('@prisma/client', () => ({
  PrismaClient: MockPrismaClient,
}));
vi.mock('@/seed/seed/permissions.seed.js', () => ({
  seedPermissions: (...args: never[]) => seedPermissionsMock(...args),
}));
vi.mock('@/seed/seed/roles.seed.js', () => ({
  seedRoles: (...args: never[]) => seedRolesMock(...args),
}));
vi.mock('@/seed/seed/admin.seed.js', () => ({
  seedDefaultAdmin: (...args: never[]) => seedDefaultAdminMock(...args),
}));
vi.mock('@/seed/seed/skills.seed.js', () => ({
  seedSkillAliases: (...args: never[]) => seedSkillAliasesMock(...args),
}));

describe('seed orchestrator', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('seeds permissions, roles, admin, and skills successfully', async () => {
    seedPermissionsMock.mockResolvedValue(new Map());
    seedRolesMock.mockResolvedValue(new Map([['ADMIN', 5]]));
    seedDefaultAdminMock.mockResolvedValue(undefined);
    seedSkillAliasesMock.mockResolvedValue(undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await import('@/seed.js');
    await flush();

    expect(seedPermissionsMock).toHaveBeenCalledTimes(1);
    expect(seedRolesMock).toHaveBeenCalledTimes(1);
    expect(seedDefaultAdminMock).toHaveBeenCalledWith(expect.anything(), 5);
    expect(seedSkillAliasesMock).toHaveBeenCalledTimes(1);
    expect(disconnectMock).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Database seeding complete');
    logSpy.mockRestore();
  });

  it('aborts admin bootstrap and exits when the ADMIN role is missing', async () => {
    seedPermissionsMock.mockResolvedValue(new Map());
    seedRolesMock.mockResolvedValue(new Map());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await import('@/seed.js');
    await flush();

    expect(errorSpy).toHaveBeenCalledWith('Database seeding failed:', expect.any(Error));
    expect(disconnectMock).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
