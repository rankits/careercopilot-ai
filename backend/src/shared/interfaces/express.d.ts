import 'express';
import type { AuthenticatedPrincipal } from '@/shared/interfaces/auth-principal.interface.js';

declare global {
  namespace Express {
    interface Request {
      /** Correlation id assigned by the request interceptor; also echoed as X-Request-Id. */
      id: string;
      /** Assisted Apply operation id (AA-014); echoed as X-Operation-Id on analyze/prepare/plan. */
      operationId?: string;
      /** Populated by `authMiddleware` after successful JWT verification. */
      user?: AuthenticatedPrincipal;
    }
  }
}
