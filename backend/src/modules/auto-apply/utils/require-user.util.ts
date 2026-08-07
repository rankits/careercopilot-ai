import { Request } from 'express';
import { AppError } from '@/shared/utils/errors/AppError.js';

/** Mirrors application-management's controller helper: resolves the caller's
 * principal id from the authenticated session only — request body/query/
 * header values (e.g. a spoofed `x-user-id`) are never trusted as identity. */
export function requireUserPrincipalId(req: Request): string {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  if (req.user.principalType !== 'USER') {
    throw new AppError('Auto Apply is available only to user accounts', 403, 'FORBIDDEN');
  }
  return String(req.user.principalId);
}

export function getParam(param: string | string[] | undefined, name: string): string {
  if (typeof param === 'string') return param;
  if (Array.isArray(param) && param.length > 0) return param[0];
  throw new AppError(`Missing required parameter: ${name}`, 400, 'BAD_REQUEST');
}
