import { describe, expect, it } from 'vitest';
import { ListApplicationsQuerySchema } from '@/modules/application-management/validations/application.validation.js';

describe('ListApplicationsQuerySchema', () => {
  it('defaults sortBy to updatedAt:desc', () => {
    const parsed = ListApplicationsQuerySchema.parse({});
    expect(parsed.sortBy).toBe('updatedAt:desc');
  });

  it('rejects non-allowlisted sortBy values', () => {
    const result = ListApplicationsQuerySchema.safeParse({ sortBy: 'passwordHash:asc' });
    expect(result.success).toBe(false);
  });

  it('accepts allowlisted sortBy values', () => {
    const result = ListApplicationsQuerySchema.safeParse({ sortBy: 'companyName:asc' });
    expect(result.success).toBe(true);
  });
});
