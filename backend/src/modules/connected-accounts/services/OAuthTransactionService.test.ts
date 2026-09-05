import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fakeDb } from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { OAuthTransactionService } from '@/modules/connected-accounts/services/OAuthTransactionService.js';
import { env } from '@/shared/config/env.conf.js';
import { prisma } from '@/shared/config/db.conf.js';

describe('OAuthTransactionService', () => {
  beforeEach(async () => {
    await resetTestState();
    env.GOOGLE_OAUTH_STATE_SIGNING_KEY = Buffer.alloc(32, 's').toString('base64');
    env.GOOGLE_OAUTH_STATE_TTL_SECONDS = 600;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it('creates a transaction with PKCE and signs state', async () => {
    const transaction = await OAuthTransactionService.createTransaction({
      userId: 1,
      sessionId: 'session-123',
      provider: 'GOOGLE',
      returnPath: '/test/path',
      requestedScopes: ['email', 'profile'],
    });

    expect(transaction.authorizationUrlState).toBeDefined();
    expect(transaction.codeChallenge).toBeDefined();

    // Verify it exists in DB
    const stateParts = transaction.authorizationUrlState.split('.');
    const stateHash = stateParts[2]; // Using naive extraction if state is base64_payload.signature.hash

    const dbTx = await prisma.oAuthTransaction.findFirst({
      where: { userId: 1, sessionId: 'session-123' },
    });

    expect(dbTx).toBeDefined();
    expect(dbTx?.pkceVerifierEncrypted).toBeDefined();
  });

  it('consumes a transaction successfully', async () => {
    const { authorizationUrlState } = await OAuthTransactionService.createTransaction({
      userId: 1,
      sessionId: 'session-123',
      provider: 'GOOGLE',
      returnPath: '/test/path',
      requestedScopes: [],
    });

    const consumed = await OAuthTransactionService.consumeTransaction(
      authorizationUrlState,
      'GOOGLE',
      1,
      'session-123',
    );

    expect(consumed).toBeDefined();
    expect(consumed.returnPath).toBe('/test/path');

    // Trying to consume again should fail
    await expect(
      OAuthTransactionService.consumeTransaction(authorizationUrlState, 'GOOGLE', 1, 'session-123'),
    ).rejects.toThrow('OAuth transaction already consumed');
  });

  it('fails if user or session mismatches', async () => {
    const { authorizationUrlState } = await OAuthTransactionService.createTransaction({
      userId: 1,
      sessionId: 'session-123',
      provider: 'GOOGLE',
      returnPath: '/test/path',
      requestedScopes: [],
    });

    await expect(
      OAuthTransactionService.consumeTransaction(authorizationUrlState, 'GOOGLE', 2, 'session-123'),
    ).rejects.toThrow(
      'Session mismatch. You must complete authorization in the same browser session.',
    );

    await expect(
      OAuthTransactionService.consumeTransaction(
        authorizationUrlState,
        'GOOGLE',
        1,
        'wrong-session',
      ),
    ).rejects.toThrow(
      'Session mismatch. You must complete authorization in the same browser session.',
    );
  });

  it('fails if state is tampered', async () => {
    const { authorizationUrlState } = await OAuthTransactionService.createTransaction({
      userId: 1,
      sessionId: 'session-123',
      provider: 'GOOGLE',
      returnPath: '/test/path',
      requestedScopes: [],
    });

    const tamperedState =
      authorizationUrlState.slice(0, -1) + (authorizationUrlState.endsWith('a') ? 'b' : 'a');

    await expect(
      OAuthTransactionService.consumeTransaction(tamperedState, 'GOOGLE', 1, 'session-123'),
    ).rejects.toThrow('State signature mismatch');
  });
});
