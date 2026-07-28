import { NextFunction, Request, Response } from "express";

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

    console.log(`[API] ${method} ${route} -> ${statusCode} (${duration}ms)`);
  });

  next();
};
