import { NextFunction, Request, Response } from "express";
import { appLogger } from "@/shared/utils/logger.js";

export const responseInterceptor = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;

  res.send = function (body) {
    res.locals.responseBody = body;
    return originalSend.call(this, body);
  };

  res.on("finish", () => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    const statusCode = res.statusCode;
    const method = req.method;
    const route = req.originalUrl;

    appLogger.info(
      {
        method,
        route,
        statusCode,
        durationMs: duration,
      },
      "API request completed",
    );
  });

  next();
};
