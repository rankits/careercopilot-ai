import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "@/shared/security/jwt.util.js";
import { getCurrentTokenVersion } from "@/shared/security/token-version.cache.js";
import { AppError } from "@/shared/utils/errors/AppError.js";

const BEARER_PREFIX = "Bearer ";

const mapTokenError = (error: unknown): Error => {
  if (error instanceof AppError) return error;
  if (error instanceof Error && error.name === "TokenExpiredError") {
    return new AppError("Access token has expired", 401, "TOKEN_EXPIRED");
  }
  if (
    error instanceof Error &&
    (error.name === "JsonWebTokenError" || error.name === "NotBeforeError")
  ) {
    return new AppError("Invalid access token", 401, "TOKEN_INVALID");
  }
  return error instanceof Error ? error : new AppError("Authentication failed", 401);
};

/**
 * Verifies the Bearer access token and attaches `req.user`. Also checks the
 * token's `tokenVersion` claim against the principal's current version so a
 * password change/reset/logout-all invalidates already-issued access
 * tokens immediately, rather than waiting out their (short) natural expiry.
 */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new AppError("Missing or malformed Authorization header", 401, "TOKEN_MISSING");
    }

    const token = header.slice(BEARER_PREFIX.length).trim();
    if (!token) {
      throw new AppError("Missing or malformed Authorization header", 401, "TOKEN_MISSING");
    }

    const payload = verifyAccessToken(token);

    const currentVersion = await getCurrentTokenVersion(payload.principalType, payload.sub);
    if (currentVersion === null) {
      throw new AppError("Account no longer exists", 401, "ACCOUNT_NOT_FOUND");
    }
    if (currentVersion !== payload.tokenVersion) {
      throw new AppError(
        "Session has been invalidated, please sign in again",
        401,
        "TOKEN_REVOKED",
      );
    }

    req.user = {
      principalId: payload.sub,
      principalType: payload.principalType,
      email: payload.email,
      role: payload.role,
      tokenVersion: payload.tokenVersion,
    };

    next();
  } catch (error) {
    next(mapTokenError(error));
  }
};

/**
 * Like `authMiddleware`, but allows anonymous requests through with
 * `req.user` left undefined instead of rejecting them. Useful for routes
 * that behave differently for authenticated vs anonymous callers without
 * requiring auth outright.
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith(BEARER_PREFIX)) {
    next();
    return;
  }
  await authMiddleware(req, res, next);
};
