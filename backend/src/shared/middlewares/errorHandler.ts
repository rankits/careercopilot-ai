import { ZodError } from "zod";
import { NextFunction, Request, Response } from "express";
import { AppError } from "@/shared/utils/errors/AppError.js";
import { errorResponse } from "@/shared/utils/response.js";

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("[ERROR] : ", err);

  if (err instanceof ZodError) {
    return res.status(400).json(errorResponse("Payload is incorrect or missing fields."));
  }

  if (err instanceof AppError && err?.code === "TOO_MANY_FAILED_ATTEMPTS") {
    return res.status(403).json({
      ...errorResponse(err.message),
      code: "TOO_MANY_FAILED_ATTEMPTS",
      data: err.data,
    });
  }

  if (err instanceof AppError && err?.code === "PASSWORD_RESET_REQUIRED") {
    return res.status(403).json({
      ...errorResponse(err.message),
      code: "PASSWORD_RESET_REQUIRED",
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(errorResponse(err.message));
  }

  return res.status(500).json(errorResponse("Internal Server Error"));
};
