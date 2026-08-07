import { describe, expect, it } from 'vitest';
import {
  isValidOperationId,
  resolveOperationId,
} from '@/modules/auto-apply/utils/operation-id.util.js';

describe('resolveOperationId (AA-014)', () => {
  it('accepts a well-formed UUID v4', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(isValidOperationId(id)).toBe(true);
    expect(resolveOperationId(id)).toBe(id);
  });

  it('generates a fresh UUID when header is missing', () => {
    const id = resolveOperationId(undefined);
    expect(isValidOperationId(id)).toBe(true);
  });

  it('rejects malformed values and regenerates', () => {
    const id = resolveOperationId('not-a-uuid');
    expect(id).not.toBe('not-a-uuid');
    expect(isValidOperationId(id)).toBe(true);
  });

  it('rejects non-v4 UUID shapes', () => {
    expect(isValidOperationId('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
    const id = resolveOperationId('550e8400-e29b-11d4-a716-446655440000');
    expect(isValidOperationId(id)).toBe(true);
  });
});
