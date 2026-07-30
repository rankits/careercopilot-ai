import 'express';
import type { AuthenticatedPrincipal } from '@/shared/interfaces/auth-principal.interface.js';

declare global {
  namespace Express {
    interface Request {
      /** Correlation id assigned by the request interceptor; also echoed as X-Request-Id. */
      id: string;
      /** Populated by `authMiddleware` after successful JWT verification. */
      user?: AuthenticatedPrincipal;
    }
  }
}
