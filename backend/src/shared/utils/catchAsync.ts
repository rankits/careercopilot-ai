import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async Express handler so a rejected promise is forwarded to
 * `next(err)` (and therefore `errorHandler`) instead of becoming an
 * unhandled rejection - Express does not do this automatically for async
 * route handlers.
 */
export const catchAsync = (handler: AsyncRequestHandler): RequestHandler => {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
};
