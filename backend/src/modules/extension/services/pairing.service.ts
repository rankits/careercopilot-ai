import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { TokenService } from '@/modules/auth/services/token.service.js';
import type { UserTokenContext } from '@/modules/auth/types/auth.types.js';

// Pairing codes are valid for 5 minutes
const PAIRING_CODE_TTL_MS = 5 * 60 * 1000;
// Extension session expires in 90 days (long lived relative to web session)
const EXTENSION_SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const hashValue = (raw: string): string => createHash('sha256').update(raw).digest('hex');

/**
 * Generates a random 6-character alphanumeric code.
 */
const generatePairingCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoiding ambiguous chars
  let code = '';
  const randomValues = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[randomValues[i] % chars.length];
  }
  return code;
};

export const ExtensionPairingService = {
  /**
   * Generates a short-lived pairing code for the given user.
   */
  async startPairing(userId: number): Promise<{ code: string; expiresAt: Date }> {
    const code = generatePairingCode();
    const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);

    await prisma.extensionPairingCode.create({
      data: {
        userId,
        codeHash: hashValue(code),
        expiresAt,
      },
    });

    return { code, expiresAt };
  },

  /**
   * Redeems a pairing code for a new extension device credential.
   */
  async redeemPairingCode(
    code: string,
    context: { ipAddress?: string; userAgent?: string }
  ): Promise<{ accessToken: string; refreshToken: string; expiresInSeconds: number }> {
    const codeHash = hashValue(code);

    const pairingCode = await prisma.extensionPairingCode.findFirst({
      where: {
        codeHash,
        redeemedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { include: { role: true } },
      },
    });

    if (!pairingCode) {
      throw new AppError('Invalid or already used pairing code', 404, 'PAIRING_CODE_INVALID');
    }

    if (pairingCode.expiresAt.getTime() < Date.now()) {
      throw new AppError('Pairing code has expired', 410, 'PAIRING_CODE_EXPIRED');
    }

    // Mark code as redeemed
    await prisma.extensionPairingCode.update({
      where: { id: pairingCode.id },
      data: { redeemedAt: new Date() },
    });

    const userCtx: UserTokenContext = {
      id: pairingCode.user.id,
      email: pairingCode.user.email,
      role: pairingCode.user.role.name,
      tokenVersion: pairingCode.user.tokenVersion,
    };

    // We issue a distinct refresh token for the device
    const rawRefreshToken = randomBytes(64).toString('hex');
    const refreshTokenHash = hashValue(rawRefreshToken);
    const expiresAt = new Date(Date.now() + EXTENSION_SESSION_TTL_MS);

    await prisma.extensionDevice.create({
      data: {
        userId: userCtx.id,
        refreshTokenHash,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        expiresAt,
      },
    });

    // We reuse TokenService's AT generator which binds tokenVersion
    const access = TokenService.generateAccessToken(userCtx);

    return {
      accessToken: access.token,
      refreshToken: rawRefreshToken,
      expiresInSeconds: access.expiresInSeconds,
    };
  },

  /**
   * Refreshes an extension device session.
   */
  async rotateSession(
    rawRefreshToken: string,
    context: { ipAddress?: string; userAgent?: string }
  ): Promise<{ accessToken: string; refreshToken: string; expiresInSeconds: number }> {
    const refreshTokenHash = hashValue(rawRefreshToken);
    const device = await prisma.extensionDevice.findUnique({
      where: { refreshTokenHash },
      include: { user: { include: { role: true } } },
    });

    if (!device) {
      throw new AppError('Invalid device token', 401, 'TOKEN_INVALID');
    }
    if (device.revokedAt) {
      throw new AppError('This device has been revoked', 401, 'DEVICE_REVOKED');
    }
    if (device.expiresAt.getTime() < Date.now()) {
      throw new AppError('Device session expired, please pair again', 401, 'TOKEN_EXPIRED');
    }

    // Generate new device tokens
    const newRawRefreshToken = randomBytes(64).toString('hex');
    const newRefreshTokenHash = hashValue(newRawRefreshToken);
    
    // Update hash in place for a single device binding.
    await prisma.extensionDevice.update({
      where: { id: device.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        ipAddress: context.ipAddress ?? device.ipAddress,
        userAgent: context.userAgent ?? device.userAgent,
      },
    });

    const userCtx: UserTokenContext = {
      id: device.user.id,
      email: device.user.email,
      role: device.user.role.name,
      tokenVersion: device.user.tokenVersion,
    };
    
    const access = TokenService.generateAccessToken(userCtx);

    return {
      accessToken: access.token,
      refreshToken: newRawRefreshToken,
      expiresInSeconds: access.expiresInSeconds,
    };
  },

  async listDevices(userId: number) {
    return prisma.extensionDevice.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
    });
  },

  async revokeDevice(userId: number, deviceId: number) {
    const device = await prisma.extensionDevice.findUnique({
      where: { id: deviceId },
    });
    if (!device || device.userId !== userId) {
      throw new AppError('Device not found', 404, 'NOT_FOUND');
    }
    if (device.revokedAt) return;

    await prisma.extensionDevice.update({
      where: { id: deviceId },
      data: { revokedAt: new Date() },
    });
  }
};
