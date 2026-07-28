import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors/AppError.js";
import { errorResponse } from "../utils/response.js";
import { logger } from "../logger/logger.js";
import { isProduction } from "../config/env.conf.js";

interface MappedError {
  statusCode: number;
  message: string;
  code: string;
}

const mapPrismaKnownError = (err: Prisma.PrismaClientKnownRequestError): MappedError => {
  switch (err.code) {
    case "P2002": {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta.target as string[]).join(", ")
        : "field";
      return {
        statusCode: 409,
        message: `A record with this ${target} already exists`,
        code: "CONFLICT",
      };
    }
    case "P2025":
      return { statusCode: 404, message: "Record not found", code: "NOT_FOUND" };
    case "P2003":
      return {
        statusCode: 409,
        message: "This action violates a related record constraint",
        code: "CONFLICT",
      };
    default:
      return { statusCode: 500, message: "Database error", code: "DATABASE_ERROR" };
  }
};

const isJsonParseError = (err: unknown): err is SyntaxError =>
  err instanceof SyntaxError && (err as { type?: string }).type === "entity.parse.failed";

/**
 * Centralized error handler. Every thrown/next()-ed error - `AppError`
 * instances, raw Zod errors, known Prisma errors, malformed-JSON body
 * parse errors, or anything unexpected - is normalized into the standard
 * error envelope here, so controllers never format error responses
 * themselves (see `shared/utils/response.ts#errorResponse`).
 */
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let message = "Internal server error";
  let code = "INTERNAL_SERVER_ERROR";
  let errors: Array<{ field?: string; message: string }> | undefined;
  let isOperational = false;

  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Payload is incorrect or missing fields.";
    code = "VALIDATION_ERROR";
    errors = err.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }));
    isOperational = true;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    // Only AppErrors that never reach here (i.e. none) should read as
    // INTERNAL_SERVER_ERROR - an operational error thrown without an
    // explicit `code` (e.g. `new AppError("Account not found", 404)`)
    // should never be mislabeled as an internal server error.
    code = err.code ?? "ERROR";
    isOperational = true;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaKnownError(err);
    statusCode = mapped.statusCode;
    message = mapped.message;
    code = mapped.code;
    isOperational = statusCode < 500;
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Invalid request payload for database operation";
    code = "DATABASE_VALIDATION_ERROR";
    isOperational = true;
  } else if (isJsonParseError(err)) {
    statusCode = 400;
    message = "Malformed JSON payload";
    code = "INVALID_JSON";
    isOperational = true;
  } else if (err instanceof Error && !isProduction) {
    message = err.message;
  }

  const logContext = { requestId: req.id, statusCode, code, path: req.originalUrl, method: req.method, err };
  if (statusCode >= 500 || !isOperational) {
    logger.error(logContext, "Unhandled error while processing request");
  } else {
    logger.warn(logContext, "Request failed with an operational error");
  }

  const data = err instanceof AppError ? err.data : undefined;

  return res.status(statusCode).json({
    ...errorResponse(message, errors, { code, requestId: req.id }),
    ...(data !== undefined && { data }),
  });
};
