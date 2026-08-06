import { describe, expect, it } from 'vitest';
import '@/test-utils/prisma-mock.js';
import { prisma } from '@/infrastructure/database/index.js';

describe('database index', () => {
  it('re-exports the shared Prisma client instance', () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma).toBe('object');
  });
});
