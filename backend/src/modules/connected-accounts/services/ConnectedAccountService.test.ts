import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fakeDb } from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { ConnectedAccountService } from '@/modules/connected-accounts/services/ConnectedAccountService.js';
import { env } from '@/shared/config/env.conf.js';
import { prisma } from '@/shared/config/db.conf.js';
import { OAuthTransactionService } from '@/modules/connected-accounts/services/OAuthTransactionService.js';
import { GoogleOAuthAdapter } from '@/modules/connected-accounts/providers/GoogleOAuthAdapter.js';

// vi.mock('../providers/GoogleOAuthAdapter.js');

describe('ConnectedAccountService', () => {
  beforeEach(async () => {
    await resetTestState();
    env.GOOGLE_OAUTH_STATE_SIGNING_KEY = Buffer.alloc(32, 's').toString('base64');
    env.GOOGLE_OAUTH_STATE_TTL_SECONDS = 600;
    env.GOOGLE_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 'k').toString('base64');
    env.GOOGLE_GMAIL_ENABLED = true;
  });

  afterEach(async () => {
    await prisma.connectedAccount.deleteMany();
    await prisma.oAuthTransaction.deleteMany();
    vi.restoreAllMocks();
  });

  it('rejects authorization if Google OAuth is disabled', async () => {
    env.GOOGLE_GMAIL_ENABLED = false;

    await expect(
      ConnectedAccountService.getAuthorizationUrl(1, 'session', 'GOOGLE', '/test'),
    ).rejects.toThrow('Google OAuth is currently disabled');
  });

  it('generates authorization URL properly', async () => {
    env.GOOGLE_GMAIL_ENABLED = true;

    vi.spyOn(GoogleOAuthAdapter.prototype, 'createAuthorizationRequest').mockResolvedValue({
      authorizationUrl: 'https://mock.google.com/auth',
    });

    const url = await ConnectedAccountService.getAuthorizationUrl(1, 'session', 'GOOGLE', '/test');
    expect(url).toBe('https://mock.google.com/auth');
  });

  it('handles Google callback and connects an account', async () => {
    const { authorizationUrlState } = await OAuthTransactionService.createTransaction({
      userId: 1,
      sessionId: 'session',
      provider: 'GOOGLE',
      returnPath: '/test',
      requestedScopes: [],
    });

    vi.spyOn(GoogleOAuthAdapter.prototype, 'exchangeAuthorizationCode').mockResolvedValue({
      providerAccountId: 'google-sub-123',
      emailAddress: 'test@example.com',
      displayName: 'Test User',
      avatarUrl: 'https://mock.avatar.com',
      grantedScopes: ['email', 'profile'],
      refreshToken: 'mock-refresh-token',
      accessToken: 'mock-access-token',
      accessTokenExpiresInSeconds: 3600,
    });

    const account = await ConnectedAccountService.handleCallback(
      1,
      'session',
      'GOOGLE',
      authorizationUrlState,
      'mock-code',
    );

    expect(account.id).toBeDefined();
    expect(account.userId).toBe(1);
    expect(account.emailAddress).toBe('test@example.com');
    expect(account.encryptedRefreshToken).toBeDefined(); // It should be encrypted JSON
  });

  it('disconnects an account', async () => {
    const account = await prisma.connectedAccount.create({
      data: {
        userId: 1,
        provider: 'GOOGLE',
        providerAccountId: 'google-sub-disconnect',
        emailAddress: 'disconnect@example.com',
        credentialKeyId: 'v1',
        encryptedRefreshToken: 'some-encrypted-stuff',
        status: 'ACTIVE',
        scopes: [],
      },
    });

    vi.spyOn(GoogleOAuthAdapter.prototype, 'revokeCredentials').mockResolvedValue(undefined);

    await ConnectedAccountService.disconnectAccount(1, account.id);

    const updated = await prisma.connectedAccount.findUnique({ where: { id: account.id } });
    expect(updated?.encryptedRefreshToken).toBeNull();
    expect(updated?.encryptedAccessToken).toBeNull();
    expect(updated?.status).toBe('REVOKED');
  });
});
