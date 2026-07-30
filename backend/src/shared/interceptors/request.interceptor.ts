import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Assigns a correlation id to every request (reusing an upstream
 * X-Request-Id if a proxy/load balancer already set one), echoes it back
 * on the response, and records the start time used by the response
 * interceptor to compute request duration.
 */
export const requestInterceptor = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers[REQUEST_ID_HEADER];
  req.id = typeof incoming === 'string' && incoming.trim() !== '' ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.id);

  req.startTime = Date.now();
  next();
};

declare global {
  namespace Express {
    interface Request {
      startTime?: number;
    }
  }
}
