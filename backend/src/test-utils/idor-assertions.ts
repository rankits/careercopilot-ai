import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

/**
 * AJA-SEC-002 — the reusable form of the IDOR/authz pattern every new Auto
 * Apply resource's security test has followed since Wave 2
 * (`application.security.api.test.ts` was the original template). New
 * resource test files may keep writing the pattern by hand as before, or
 * call `describeRequiresAuth` to get the same 401-without-auth coverage
 * from one declarative list instead of a hand-written `it.each` block.
 * Existing test files are not required to migrate — this exists so the
 * *next* resource doesn't have to re-derive the pattern from scratch.
 */
export interface UnauthenticatedCase {
  method: 'get' | 'post' | 'patch' | 'delete';
  path: string;
  body?: Record<string, unknown>;
}

export function describeRequiresAuth(app: Express, cases: UnauthenticatedCase[]): void {
  describe('requires authentication', () => {
    it.each(cases.map((c) => [c.method.toUpperCase(), c.path, c.body] as const))(
      '%s %s returns 401 without auth (x-user-id ignored)',
      async (method, path, body) => {
        const req = request(app)
          [method.toLowerCase() as UnauthenticatedCase['method']](path)
          .set('x-user-id', 'spoofed-user');
        const res = body ? await req.send(body) : await req;
        expect(res.status).toBe(401);
      },
    );
  });
}
