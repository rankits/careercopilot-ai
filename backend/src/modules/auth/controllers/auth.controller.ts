import { Request, Response } from "express";
import * as authService from "../services/auth.service.js";
import { AppError } from "../../../shared/utils/errors/AppError.js";
import { catchAsync } from "../../../shared/utils/catchAsync.js";
import { successResponse } from "../../../shared/utils/response.js";
import { toSafeUserResponse } from "../utils/auth.mapper.js";
import { REFRESH_TOKEN_COOKIE_KEY } from "../constants/auth.constant.js";
import { clearRefreshCookieOptions, refreshCookieOptions } from "../config/cookies.conf.js";
import type { AuthSession, AuthTokens, RequestContext } from "../types/auth.types.js";

const getRequestContext = (req: Request): RequestContext => ({
  ipAddress: req.ip,
  userAgent: req.headers["user-agent"],
});

const requirePrincipalId = (req: Request): string => {
  if (!req.user) throw new AppError("Authentication required", 401);
  return req.user.principalId;
};

/** Prefers the httpOnly cookie (browser clients); falls back to the body for non-browser clients. */
const getRefreshTokenFromRequest = (req: Request): string | undefined =>
  (req.cookies?.[REFRESH_TOKEN_COOKIE_KEY] as string | undefined) ??
  (req.body as { refreshToken?: string })?.refreshToken;

const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  res.cookie(REFRESH_TOKEN_COOKIE_KEY, refreshToken, refreshCookieOptions);
};

const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_KEY, clearRefreshCookieOptions);
};

const sendSession = (res: Response, session: AuthSession, message: string) => {
  setRefreshTokenCookie(res, session.tokens.refreshToken);
  return res.status(200).json({
    ...successResponse(message, { user: toSafeUserResponse(session.user) }),
    accessToken: session.tokens.accessToken,
    accessTokenExpiresInSeconds: session.tokens.accessTokenExpiresInSeconds,
  });
};

const sendTokens = (res: Response, tokens: AuthTokens, message: string) => {
  setRefreshTokenCookie(res, tokens.refreshToken);
  return res.status(200).json({
    ...successResponse(message),
    accessToken: tokens.accessToken,
    accessTokenExpiresInSeconds: tokens.accessTokenExpiresInSeconds,
  });
};

export const registerController = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.register(req.body, getRequestContext(req));
  return res.status(201).json(successResponse(result.message, { email: result.email }));
});

export const resendOtpController = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.resendOtp(req.body, getRequestContext(req));
  return res.status(200).json(successResponse(result.message));
});

export const verifyRegistrationOtpController = catchAsync(async (req: Request, res: Response) => {
  const session = await authService.verifyRegistrationOtp(req.body, getRequestContext(req));
  return sendSession(res, session, "Email verified successfully");
});

export const loginController = catchAsync(async (req: Request, res: Response) => {
  const session = await authService.login(req.body, getRequestContext(req));
  return sendSession(res, session, "Login successful");
});

export const requestLoginOtpController = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.requestLoginOtp(req.body, getRequestContext(req));
  return res.status(200).json(successResponse(result.message));
});

export const verifyLoginOtpController = catchAsync(async (req: Request, res: Response) => {
  const session = await authService.verifyLoginOtp(req.body, getRequestContext(req));
  return sendSession(res, session, "Login successful");
});

export const forgotPasswordController = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body, getRequestContext(req));
  return res.status(200).json(successResponse(result.message));
});

export const resetPasswordController = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.resetPassword(req.body, getRequestContext(req));
  return res.status(200).json(successResponse(result.message));
});

export const changePasswordController = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.changePassword(
    requirePrincipalId(req),
    req.body,
    getRequestContext(req),
  );
  return res.status(200).json(successResponse(result.message));
});

export const refreshController = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (!refreshToken) {
    throw new AppError("A valid refresh token is required", 401, "TOKEN_MISSING");
  }
  const tokens = await authService.refreshSession(refreshToken, getRequestContext(req));
  return sendTokens(res, tokens, "Session refreshed");
});

export const logoutController = catchAsync(async (req: Request, res: Response) => {
  const refreshTokenFromCookie = req.cookies?.[REFRESH_TOKEN_COOKIE_KEY] as string | undefined;
  const result = await authService.logout(req.body, refreshTokenFromCookie, getRequestContext(req));
  clearRefreshTokenCookie(res);
  return res.status(200).json(successResponse(result.message));
});

export const logoutAllController = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.logoutAll(requirePrincipalId(req), getRequestContext(req));
  clearRefreshTokenCookie(res);
  return res.status(200).json(successResponse(result.message));
});

export const meController = catchAsync(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(requirePrincipalId(req));
  return res.status(200).json(successResponse("Current session", toSafeUserResponse(user)));
});

export default {
  registerController,
  resendOtpController,
  verifyRegistrationOtpController,
  loginController,
  requestLoginOtpController,
  verifyLoginOtpController,
  forgotPasswordController,
  resetPasswordController,
  changePasswordController,
  refreshController,
  logoutController,
  logoutAllController,
  meController,
};
