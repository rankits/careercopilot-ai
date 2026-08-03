import { createHash, randomInt } from 'node:crypto';
import { OtpPurpose, OtpTransport } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { securityConfig } from '@/shared/config/security.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { isDevelopment } from '@/shared/config/env.conf.js';

const hashCode = (code: string): string => createHash('sha256').update(code).digest('hex');

const generateCode = (length: number): string => {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(randomInt(min, max + 1)).padStart(length, '0');
};

/**
 * Postgres-backed OTP lifecycle (see the `Otp` model): one row per
 * (transport, target, purpose), upserted on each resend. Durable and
 * auditable by design - codes survive a cache/process restart and are
 * visible to `psql`/BI tooling. The caching layer (infrastructure/cache)
 * is used elsewhere (rate limiting, tokenVersion cache, RBAC permission
 * cache), deliberately not here.
 */
export const OtpService = {
  async issue(
    purpose: OtpPurpose,
    target: string,
    transport: OtpTransport = OtpTransport.Email,
  ): Promise<string> {
    const existing = await prisma.otp.findUnique({
      where: { transport_target_purpose: { transport, target, purpose } },
    });

    if (existing?.blocked) {
      throw new AppError(
        'This address has been blocked from requesting codes. Contact support.',
        429,
        'TOO_MANY_REQUESTS',
      );
    }

    if (existing) {
      const cooldownEndsAt =
        existing.lastSentAt.getTime() + securityConfig.otp.resendCooldownSeconds * 1000;
      if (cooldownEndsAt > Date.now()) {
        throw new AppError('Please wait before requesting another code', 429, 'TOO_MANY_REQUESTS', {
          retryAfterSeconds: Math.ceil((cooldownEndsAt - Date.now()) / 1000),
        });
      }
    }

    const nextAttempt = existing ? existing.attempt + 1 : 1;
    if (existing && nextAttempt > securityConfig.otp.maxResendCount) {
      await prisma.otp.update({ where: { id: existing.id }, data: { blocked: true } });
      throw new AppError(
        'Too many codes requested for this address. Please contact support.',
        429,
        'TOO_MANY_REQUESTS',
      );
    }

    const code = isDevelopment ? '000000' : generateCode(securityConfig.otp.length);
    const expiresAt = new Date(Date.now() + securityConfig.otp.ttlSeconds * 1000);

    await prisma.otp.upsert({
      where: { transport_target_purpose: { transport, target, purpose } },
      create: {
        transport,
        target,
        purpose,
        code: hashCode(code),
        attempt: 1,
        retries: 0,
        lastSentAt: new Date(),
        expiresAt,
        lastCodeVerified: false,
        blocked: false,
      },
      update: {
        code: hashCode(code),
        attempt: nextAttempt,
        retries: 0,
        lastSentAt: new Date(),
        expiresAt,
        lastCodeVerified: false,
      },
    });

    return code;
  },

  async verify(
    purpose: OtpPurpose,
    target: string,
    submittedCode: string,
    transport: OtpTransport = OtpTransport.Email,
  ): Promise<boolean> {
    const record = await prisma.otp.findUnique({
      where: { transport_target_purpose: { transport, target, purpose } },
    });

    if (!record) return false; // never issued
    if (record.blocked) {
      throw new AppError(
        'This address has been blocked from verifying codes. Contact support.',
        429,
        'TOO_MANY_REQUESTS',
      );
    }
    if (record.lastCodeVerified) return false; // single-use: this code was already consumed
    if (record.expiresAt.getTime() < Date.now()) return false;

    if (record.retries >= securityConfig.otp.maxAttempts) {
      await prisma.otp.update({ where: { id: record.id }, data: { blocked: true } });
      throw new AppError(
        'Too many incorrect attempts. Please request a new code.',
        429,
        'TOO_MANY_REQUESTS',
      );
    }

    if (record.code !== hashCode(submittedCode)) {
      await prisma.otp.update({ where: { id: record.id }, data: { retries: { increment: 1 } } });
      return false;
    }

    await prisma.otp.update({ where: { id: record.id }, data: { lastCodeVerified: true } });
    return true;
  },
};
