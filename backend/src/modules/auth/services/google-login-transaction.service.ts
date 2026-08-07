import crypto from 'node:crypto';

import { prisma } from '@/shared/config/db.conf.js';
import { env } from '@/shared/config/env.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

export interface CreatedGoogleLoginTransaction {
  authorizationUrlState: string;
  codeVerifier: string;
  codeChallenge: string;
}

export class GoogleLoginTransactionService {
  static async create(returnPath: string): Promise<CreatedGoogleLoginTransaction> {
    if (!env.GOOGLE_OAUTH_STATE_SIGNING_KEY) {
      throw new AppError(
        'Google login state signing is not configured',
        500,
        'GOOGLE_LOGIN_NOT_CONFIGURED',
      );
    }

    const { codeVerifier, codeChallenge } = this.generatePkcePair();
    const rawNonce = crypto.randomBytes(32).toString('hex');
    const stateHash = this.hashState(rawNonce);
    const expiresAt = new Date(Date.now() + env.GOOGLE_OAUTH_STATE_TTL_SECONDS * 1000);

    await prisma.googleLoginTransaction.create({
      data: {
        stateHash,
        pkceVerifierEncrypted: codeVerifier,
        returnPath,
        expiresAt,
      },
    });

    const signature = this.signState(rawNonce);
    return {
      authorizationUrlState: `${rawNonce}.${signature}`,
      codeVerifier,
      codeChallenge,
    };
  }

  static async consume(authorizationUrlState: string): Promise<{
    codeVerifier: string;
    returnPath: string;
  }> {
    if (!authorizationUrlState || typeof authorizationUrlState !== 'string') {
      throw new AppError('Invalid OAuth state', 400, 'GOOGLE_LOGIN_STATE_INVALID');
    }

    const parts = authorizationUrlState.split('.');
    if (parts.length !== 2) {
      throw new AppError('Invalid OAuth state', 400, 'GOOGLE_LOGIN_STATE_INVALID');
    }

    const [rawNonce, signature] = parts;
    const expectedSignature = this.signState(rawNonce);
    const signatureBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    if (
      signatureBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(signatureBuf, expectedBuf)
    ) {
      throw new AppError('Invalid OAuth state', 400, 'GOOGLE_LOGIN_STATE_INVALID');
    }

    const stateHash = this.hashState(rawNonce);
    const transaction = await prisma.googleLoginTransaction.findUnique({ where: { stateHash } });
    if (!transaction) {
      throw new AppError('OAuth transaction not found', 400, 'GOOGLE_LOGIN_STATE_INVALID');
    }
    if (transaction.consumedAt) {
      throw new AppError('OAuth transaction already used', 400, 'GOOGLE_LOGIN_STATE_INVALID');
    }
    if (transaction.expiresAt.getTime() < Date.now()) {
      throw new AppError('OAuth transaction expired', 400, 'GOOGLE_LOGIN_STATE_INVALID');
    }

    const updated = await prisma.googleLoginTransaction.updateMany({
      where: { id: transaction.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (updated.count !== 1) {
      throw new AppError('OAuth transaction already used', 400, 'GOOGLE_LOGIN_STATE_INVALID');
    }

    return {
      codeVerifier: transaction.pkceVerifierEncrypted,
      returnPath: transaction.returnPath,
    };
  }

  private static generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  private static hashState(rawNonce: string): string {
    return crypto.createHash('sha256').update(rawNonce, 'utf8').digest('hex');
  }

  private static signState(rawNonce: string): string {
    return crypto
      .createHmac('sha256', Buffer.from(env.GOOGLE_OAUTH_STATE_SIGNING_KEY!, 'base64'))
      .update(rawNonce, 'utf8')
      .digest('base64url');
  }
}
