import { AsyncLocalStorage } from 'node:async_hooks';
import { NextFunction, Request, Response } from 'express';
import {
  OPERATION_ID_HEADER,
  resolveOperationId,
} from '@/modules/auto-apply/utils/operation-id.util.js';
import { createChildLogger, logger } from '@/shared/logger/logger.js';
import type { Logger } from 'pino';

export interface OperationIdStore {
  operationId: string;
  log: Logger;
}

const als = new AsyncLocalStorage<OperationIdStore>();

export function getOperationId(): string | undefined {
  return als.getStore()?.operationId;
}

/** Request-scoped child logger with `operationId` bound, or the root logger. */
export function getOperationLogger(): Logger {
  return als.getStore()?.log ?? logger;
}

/**
 * AA-014: set `req.operationId`, echo `X-Operation-Id`, and bind a child logger
 * for the remainder of the request via AsyncLocalStorage.
 */
export function operationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const operationId = resolveOperationId(req.headers[OPERATION_ID_HEADER]);
  req.operationId = operationId;
  res.setHeader('X-Operation-Id', operationId);

  const log = createChildLogger({ operationId });
  als.run({ operationId, log }, () => next());
}
