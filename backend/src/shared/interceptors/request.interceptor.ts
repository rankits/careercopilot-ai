import { NextFunction, Request, Response } from "express";

export const requestInterceptor = (req: Request, _res: Response, next: NextFunction) => {
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
