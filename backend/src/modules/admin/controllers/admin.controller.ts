import { Request, Response } from 'express';
import * as adminService from '@/modules/admin/services/admin.service.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { catchAsync } from '@/shared/utils/catchAsync.js';
import { successResponse } from '@/shared/utils/response.js';
import { toSafeAdminResponse } from '@/modules/admin/utils/admin.mapper.js';
import type { RequestContext } from '@/modules/admin/types/admin.types.js';

const getRequestContext = (req: Request): RequestContext => ({
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});

const requirePrincipalId = (req: Request): string => {
  if (!req.user) throw new AppError('Authentication required', 401);
  return req.user.principalId;
};

export const loginController = catchAsync(async (req: Request, res: Response) => {
  const session = await adminService.login(req.body, getRequestContext(req));
  return res.status(200).json(
    successResponse('Login successful', {
      admin: toSafeAdminResponse(session.admin),
      tokens: {
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
        tokenType: 'Bearer' as const,
        expiresInSeconds: session.tokens.accessTokenExpiresInSeconds,
      },
    }),
  );
});

export const changePasswordController = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.changePassword(
    requirePrincipalId(req),
    req.body,
    getRequestContext(req),
  );
  return res.status(200).json(successResponse(result.message));
});

export const refreshController = catchAsync(async (req: Request, res: Response) => {
  const tokens = await adminService.refreshSession(req.body, getRequestContext(req));
  return res.status(200).json(
    successResponse('Session refreshed', {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer' as const,
      expiresInSeconds: tokens.accessTokenExpiresInSeconds,
    }),
  );
});

export const logoutController = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.logout(req.body, getRequestContext(req));
  return res.status(200).json(successResponse(result.message));
});

export const logoutAllController = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.logoutAll(requirePrincipalId(req), getRequestContext(req));
  return res.status(200).json(successResponse(result.message));
});

export const meController = catchAsync(async (req: Request, res: Response) => {
  const admin = await adminService.getCurrentAdmin(requirePrincipalId(req));
  return res.status(200).json(successResponse('Current session', toSafeAdminResponse(admin)));
});

export const systemStatsController = catchAsync(async (_req: Request, res: Response) => {
  const stats = await adminService.getSystemStats();
  return res.status(200).json(successResponse('System statistics', stats));
});

export default {
  loginController,
  changePasswordController,
  refreshController,
  logoutController,
  logoutAllController,
  meController,
  systemStatsController,
};
