import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectedAccountProvider, ConnectedAccountStatus } from '@prisma/client';

import { env } from '@/shared/config/env.conf.js';
import {
  ConnectedAccountCredentialService,
  GMAIL_SEND_SCOPE,
} from '@/modules/connected-accounts/services/ConnectedAccountCredentialService.js';
import { ProviderCredentialVault } from '@/modules/connected-accounts/services/ProviderCredentialVault.js';

const { mockFindUnique, mockUpdate, refreshCredentials } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  refreshCredentials: vi.fn(),
}));

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: {
    connectedAccount: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

vi.mock('../providers/GoogleOAuthAdapter.js', () => ({
  GoogleOAuthAdapter: class {
    refreshCredentials = refreshCredentials;
  },
}));

describe('ConnectedAccountCredentialService', () => {
  const encryptionKey = Buffer.alloc(32, 3).toString('base64');

  beforeEach(() => {
    vi.clearAllMocks();
    env.GOOGLE_GMAIL_ENABLED = true;
    env.GOOGLE_TOKEN_ENCRYPTION_KEY = encryptionKey;
    env.GOOGLE_TOKEN_ENCRYPTION_KEY_ID = 'v1';
    env.GOOGLE_TOKEN_REFRESH_SKEW_SECONDS = 300;
  });

  it('returns a still-valid access token without refreshing', async () => {
    const access = ProviderCredentialVault.encrypt('valid-access', {
      userId: 1,
      provider: ConnectedAccountProvider.GOOGLE,
      providerAccountId: 'sub-1',
      credentialType: 'access_token',
    });

    mockFindUnique.mockResolvedValue({
      id: 5,
      userId: 1,
      provider: ConnectedAccountProvider.GOOGLE,
      providerAccountId: 'sub-1',
      emailAddress: 'a@gmail.com',
      displayName: 'A',
      status: ConnectedAccountStatus.ACTIVE,
      grantedScopes: [GMAIL_SEND_SCOPE],
      encryptedAccessToken: JSON.stringify(access),
      encryptedRefreshToken: 'unused',
      accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const resolved = await ConnectedAccountCredentialService.resolveSendableGoogleAccount({
      userId: 1,
      accountId: 5,
    });

    expect(resolved.accessToken).toBe('valid-access');
    expect(refreshCredentials).not.toHaveBeenCalled();
  });

  it('rejects accounts missing gmail.send', async () => {
    mockFindUnique.mockResolvedValue({
      id: 5,
      userId: 1,
      provider: ConnectedAccountProvider.GOOGLE,
      providerAccountId: 'sub-1',
      emailAddress: 'a@gmail.com',
      displayName: 'A',
      status: ConnectedAccountStatus.ACTIVE,
      grantedScopes: ['openid', 'email'],
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      accessTokenExpiresAt: null,
    });

    await expect(
      ConnectedAccountCredentialService.resolveSendableGoogleAccount({
        userId: 1,
        accountId: 5,
      }),
    ).rejects.toMatchObject({ code: 'CONNECTED_ACCOUNT_MISSING_GMAIL_SEND_SCOPE' });
  });

  it('refreshes an expired access token and persists the new ciphertext', async () => {
    const refresh = ProviderCredentialVault.encrypt('refresh-token', {
      userId: 1,
      provider: ConnectedAccountProvider.GOOGLE,
      providerAccountId: 'sub-1',
      credentialType: 'refresh_token',
    });

    mockFindUnique.mockResolvedValue({
      id: 5,
      userId: 1,
      provider: ConnectedAccountProvider.GOOGLE,
      providerAccountId: 'sub-1',
      emailAddress: 'a@gmail.com',
      displayName: 'A',
      status: ConnectedAccountStatus.ACTIVE,
      grantedScopes: [GMAIL_SEND_SCOPE],
      encryptedAccessToken: null,
      encryptedRefreshToken: JSON.stringify(refresh),
      accessTokenExpiresAt: new Date(Date.now() - 1000),
    });

    refreshCredentials.mockResolvedValue({
      newAccessToken: 'new-access',
      newAccessTokenExpiresInSeconds: 3600,
    });
    mockUpdate.mockResolvedValue({});

    const resolved = await ConnectedAccountCredentialService.resolveSendableGoogleAccount({
      userId: 1,
      accountId: 5,
    });

    expect(resolved.accessToken).toBe('new-access');
    expect(refreshCredentials).toHaveBeenCalledWith({ refreshToken: 'refresh-token' });
    expect(mockUpdate).toHaveBeenCalled();
  });
});
