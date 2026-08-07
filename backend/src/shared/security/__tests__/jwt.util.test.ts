import { describe, expect, it, vi } from 'vitest';
import {
  getAccessTokenTtlSeconds,
  parseDurationSeconds,
  signAccessToken,
  verifyAccessToken,
} from '@/shared/security/jwt.util.js';

const jwtMock = vi.hoisted(() => ({ sign: vi.fn(), verify: vi.fn() }));
vi.mock('jsonwebtoken', () => ({ default: jwtMock }));

describe('jwt.util', () => {
  it('signAccessToken signs a payload with the configured options', () => {
    jwtMock.sign.mockReturnValue('signed-token');
    const payload = {
      sub: 1,
      principalType: 'USER',
      email: 'a@b.com',
      role: 'USER',
      tokenVersion: 0,
    };
    const result = signAccessToken(payload);
    expect(result).toBe('signed-token');
    expect(jwtMock.sign).toHaveBeenCalled();
    const [calledPayload, secret, options] = jwtMock.sign.mock.calls[0];
    expect(calledPayload).toEqual(payload);
    expect(secret).toBeTruthy();
    expect(options.algorithm).toBe('HS256');
    expect(options.issuer).toBe('careercopilot-api');
  });

  it('verifyAccessToken verifies with issuer/audience/algorithms constraint', () => {
    const decoded = {
      sub: 2,
      principalType: 'ADMIN',
      email: 'a@b.com',
      role: 'ADMIN',
      tokenVersion: 1,
    };
    jwtMock.verify.mockReturnValue(decoded);
    const out = verifyAccessToken('the-token');
    expect(out).toEqual(decoded);
    const [token, secret, opts] = jwtMock.verify.mock.calls[0];
    expect(token).toBe('the-token');
    expect(opts.algorithms).toEqual(['HS256']);
    expect(opts.audience).toBe('careercopilot-client');
  });

  it('parseDurationSeconds handles each unit and multiplier', () => {
    expect(parseDurationSeconds('30s')).toBe(30);
    expect(parseDurationSeconds('15m')).toBe(900);
    expect(parseDurationSeconds('2h')).toBe(7200);
    expect(parseDurationSeconds('2d')).toBe(172800);
    expect(parseDurationSeconds(' 5m ')).toBe(300);
  });

  it('parseDurationSeconds falls back when the value does not match', () => {
    expect(parseDurationSeconds('30')).toBe(900);
    expect(parseDurationSeconds('30x')).toBe(900);
    expect(parseDurationSeconds('')).toBe(900);
    expect(parseDurationSeconds('garbage', 123)).toBe(123);
  });

  it('getAccessTokenTtlSeconds parses the configured expires-in', () => {
    expect(getAccessTokenTtlSeconds()).toBe(900);
  });
});
