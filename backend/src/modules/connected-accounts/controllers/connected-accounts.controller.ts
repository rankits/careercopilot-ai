import { createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { ConnectedAccountProvider } from '@prisma/client';

import { ConnectedAccountService } from '@/modules/connected-accounts/services/ConnectedAccountService.js';
import { REFRESH_TOKEN_COOKIE_KEY } from '@/modules/auth/constants/auth.constant.js';
import { successResponse } from '@/shared/utils/response.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const hashToken = (raw: string): string => createHash('sha256').update(raw).digest('hex');

const requireUserPrincipalId = (req: Request): number => {
  if (!req.user || req.user.principalType !== 'USER') {
    throw new AppError('Authentication required', 401);
  }
  return req.user.principalId;
};

/**
 * Bind OAuth transactions to the current refresh-token session (same hash
 * stored on UserSession.sessionId). Falls back to a principal-scoped key
 * when the cookie is absent (e.g. bearer-only clients).
 */
const resolveSessionId = (req: Request, userId: number): string => {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_KEY] as string | undefined;
  if (refreshToken && refreshToken.length > 0) {
    return hashToken(refreshToken);
  }
  return `user:${userId}`;
};

export const getConnectedAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = requireUserPrincipalId(req);
    const accounts = await ConnectedAccountService.getUserAccounts(userId);
    res.status(200).json(successResponse('Connected accounts retrieved', accounts));
  } catch (err) {
    next(err);
  }
};

export const authorizeGoogle = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = requireUserPrincipalId(req);
    const sessionId = resolveSessionId(req, userId);
    const { returnPath = '/settings/connected-accounts/google/result' } = req.body as {
      returnPath?: string;
    };

    const url = await ConnectedAccountService.getAuthorizationUrl(
      userId,
      sessionId,
      ConnectedAccountProvider.GOOGLE,
      returnPath,
    );

    res.status(200).json(successResponse('Authorization URL generated', { url }));
  } catch (err) {
    next(err);
  }
};

export const googleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = requireUserPrincipalId(req);
    const sessionId = resolveSessionId(req, userId);
    const { state, code } = req.body as { state: string; code: string };

    const account = await ConnectedAccountService.handleCallback(
      userId,
      sessionId,
      ConnectedAccountProvider.GOOGLE,
      state,
      code,
    );

    const {
      encryptedRefreshToken: _rt,
      encryptedAccessToken: _at,
      ...safeAccount
    } = account as {
      encryptedRefreshToken?: string;
      encryptedAccessToken?: string;
      [key: string]: unknown;
    };

    res.status(200).json(successResponse('Google account connected successfully', safeAccount));
  } catch (err) {
    next(err);
  }
};

export const disconnectAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = requireUserPrincipalId(req);
    const accountId = Number.parseInt(String(req.params.accountId), 10);
    if (!Number.isFinite(accountId)) {
      throw new AppError('Invalid account id', 400);
    }

    await ConnectedAccountService.disconnectAccount(userId, accountId);

    res.status(200).json(successResponse('Account disconnected successfully'));
  } catch (err) {
    next(err);
  }
};
