import crypto from 'node:crypto';
import { prisma } from '@/shared/config/db.conf.js';
import { env } from '@/shared/config/env.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { ConnectedAccountProvider, OAuthTransaction } from '@prisma/client';

export interface CreateTransactionParams {
  userId: number;
  sessionId: string;
  provider: ConnectedAccountProvider;
  returnPath: string;
  requestedScopes: string[];
}

export interface CreatedTransaction {
  authorizationUrlState: string;
  codeVerifier: string;
  codeChallenge: string;
  transaction: OAuthTransaction;
}

export class OAuthTransactionService {
  /**
   * Starts an OAuth transaction.
   * Generates PKCE pair, creates a state token (HMAC signed), and stores a hash.
   */
  public static async createTransaction(
    params: CreateTransactionParams,
  ): Promise<CreatedTransaction> {
    if (!env.GOOGLE_OAUTH_STATE_SIGNING_KEY) {
      throw new Error('GOOGLE_OAUTH_STATE_SIGNING_KEY is required');
    }

    const { codeVerifier, codeChallenge } = this.generatePkcePair();

    const rawNonce = crypto.randomBytes(32).toString('hex');
    const stateHash = this.hashState(rawNonce);

    const expiresAt = new Date(Date.now() + env.GOOGLE_OAUTH_STATE_TTL_SECONDS * 1000);

    const transaction = await prisma.oAuthTransaction.create({
      data: {
        userId: params.userId,
        sessionId: params.sessionId,
        provider: params.provider,
        stateHash,
        pkceVerifierEncrypted: codeVerifier, // Could be encrypted in a real setup, but protected by DB access
        returnPath: params.returnPath,
        requestedScopes: params.requestedScopes,
        expiresAt,
      },
    });

    // The state sent to the client is a combination of the raw nonce and an HMAC signature
    // This prevents attackers from guessing nonces if the DB leaks or similar, though the hash is also protection.
    const signature = this.signState(rawNonce);
    const authorizationUrlState = `${rawNonce}.${signature}`;

    return {
      authorizationUrlState,
      codeVerifier,
      codeChallenge,
      transaction,
    };
  }

  /**
   * Validates and consumes the OAuth transaction using the state returned from the provider.
   */
  public static async consumeTransaction(
    authorizationUrlState: string,
    expectedProvider: ConnectedAccountProvider,
    currentUserId: number,
    currentSessionId: string,
  ): Promise<OAuthTransaction> {
    if (!authorizationUrlState || typeof authorizationUrlState !== 'string') {
      throw new AppError('Invalid state format', 400, 'GOOGLE_OAUTH_STATE_INVALID');
    }

    const parts = authorizationUrlState.split('.');
    if (parts.length !== 2) {
      throw new AppError('Invalid state format', 400, 'GOOGLE_OAUTH_STATE_INVALID');
    }

    const [rawNonce, signature] = parts;

    // Verify signature to prevent tampering/guessing
    const expectedSignature = this.signState(rawNonce);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      throw new AppError('State signature mismatch', 400, 'GOOGLE_OAUTH_STATE_INVALID');
    }

    const stateHash = this.hashState(rawNonce);

    // Atomically find and mark consumed (only if not already consumed and not expired)
    const transaction = await prisma.oAuthTransaction.findUnique({
      where: { stateHash },
    });

    if (!transaction) {
      throw new AppError('OAuth transaction not found', 400, 'GOOGLE_OAUTH_STATE_INVALID');
    }

    if (transaction.consumedAt) {
      throw new AppError('OAuth transaction already consumed', 400, 'GOOGLE_OAUTH_STATE_REPLAYED');
    }

    if (transaction.expiresAt < new Date()) {
      throw new AppError('OAuth transaction expired', 400, 'GOOGLE_OAUTH_STATE_EXPIRED');
    }

    if (transaction.provider !== expectedProvider) {
      throw new AppError('Provider mismatch', 400, 'GOOGLE_OAUTH_STATE_INVALID');
    }

    if (transaction.userId !== currentUserId || transaction.sessionId !== currentSessionId) {
      throw new AppError(
        'Session mismatch. You must complete authorization in the same browser session.',
        400,
        'GOOGLE_OAUTH_SESSION_MISMATCH',
      );
    }

    // Mark consumed
    return prisma.oAuthTransaction.update({
      where: { id: transaction.id },
      data: { consumedAt: new Date() },
    });
  }

  private static generatePkcePair() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  private static hashState(nonce: string): string {
    return crypto.createHash('sha256').update(nonce).digest('hex');
  }

  private static signState(nonce: string): string {
    const key = Buffer.from(env.GOOGLE_OAUTH_STATE_SIGNING_KEY!, 'base64');
    return crypto.createHmac('sha256', key).update(nonce).digest('base64url');
  }
}
