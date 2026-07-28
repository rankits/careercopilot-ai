import type { PrincipalType } from "../security/jwt.util.js";

/**
 * Decoded access-token principal attached to `req.user` by
 * `shared/middlewares/auth.middleware.ts`. `principalId` is the Admin/User
 * `publicId` - never the internal sequential db id. `tokenVersion` is
 * compared against the principal's current `tokenVersion` so tokens
 * issued before a password change/reset/logout-all are rejected
 * immediately.
 */
export interface AuthenticatedPrincipal {
  principalId: string;
  principalType: PrincipalType;
  email: string;
  role: string;
  tokenVersion: number;
}
