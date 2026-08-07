import { ConnectedAccount, ConnectedAccountProvider, ConnectedAccountStatus } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { GoogleOAuthAdapter } from '@/modules/connected-accounts/providers/GoogleOAuthAdapter.js';
import { OAuthTransactionService } from '@/modules/connected-accounts/services/OAuthTransactionService.js';
import {
  ProviderCredentialVault,
  EncryptedSecretContext,
} from '@/modules/connected-accounts/services/ProviderCredentialVault.js';
import { logger } from '@/shared/logger/logger.js';
import { env } from '@/shared/config/env.conf.js';

export class ConnectedAccountService {
  private static googleAdapter = new GoogleOAuthAdapter();

  /**
   * Generates the authorization URL for a specific provider.
   */
  public static async getAuthorizationUrl(
    userId: number,
    sessionId: string,
    provider: ConnectedAccountProvider,
    returnPath: string,
  ): Promise<string> {
    if (provider === ConnectedAccountProvider.GOOGLE && !env.GOOGLE_GMAIL_ENABLED) {
      throw new AppError('Google OAuth is currently disabled', 403, 'GOOGLE_OAUTH_DISABLED');
    }

    const adapter = this.getAdapter(provider);

    // Using default scopes from env
    const requestedScopes =
      provider === ConnectedAccountProvider.GOOGLE
        ? env.GOOGLE_OAUTH_SCOPES.split(',').map((s) => s.trim())
        : [];

    const { authorizationUrlState, codeChallenge } =
      await OAuthTransactionService.createTransaction({
        userId,
        sessionId,
        provider,
        returnPath,
        requestedScopes,
      });

    const { authorizationUrl } = await adapter.createAuthorizationRequest({
      state: authorizationUrlState,
      returnPath,
      pkceChallenge: codeChallenge,
    });

    return authorizationUrl;
  }

  /**
   * Handles the OAuth callback, exchanges code for tokens, and persists the connection securely.
   */
  public static async handleCallback(
    userId: number,
    sessionId: string,
    provider: ConnectedAccountProvider,
    state: string,
    code: string,
  ): Promise<ConnectedAccount> {
    const adapter = this.getAdapter(provider);

    // 1. Consume transaction securely (validates state, expiresAt, session mismatch)
    const transaction = await OAuthTransactionService.consumeTransaction(
      state,
      provider,
      userId,
      sessionId,
    );

    // 2. Exchange code via the provider adapter
    const authResult = await adapter.exchangeAuthorizationCode({
      code,
      returnPath: transaction.returnPath,
      pkceVerifier: transaction.pkceVerifierEncrypted,
    });

    // 3. Prevent cross-user account linking conflicts
    const existingGlobalLink = await prisma.connectedAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: authResult.providerAccountId,
        },
      },
    });

    if (existingGlobalLink && existingGlobalLink.userId !== userId) {
      throw new AppError(
        'This Google account is already connected to another Career Copilot user.',
        409,
        'GOOGLE_ACCOUNT_ALREADY_CONNECTED',
      );
    }

    // 4. Enforce single active account per provider for the current user
    const existingUserLink = await prisma.connectedAccount.findFirst({
      where: {
        userId,
        provider,
      },
    });

    let encryptedRefreshToken: string | undefined;
    let encryptedAccessToken: string | undefined;

    const encryptionContext: EncryptedSecretContext = {
      userId,
      provider,
      providerAccountId: authResult.providerAccountId,
      credentialType: 'refresh_token',
    };

    if (authResult.refreshToken) {
      const encryptedSecret = ProviderCredentialVault.encrypt(
        authResult.refreshToken,
        encryptionContext,
      );
      encryptedRefreshToken = JSON.stringify(encryptedSecret);
    } else if (
      existingUserLink?.encryptedRefreshToken &&
      existingUserLink.providerAccountId === authResult.providerAccountId
    ) {
      // Reconnecting the same account without a new refresh token? Keep the old one.
      encryptedRefreshToken = existingUserLink.encryptedRefreshToken;
    } else {
      // New connection but no refresh token returned
      // The status will be marked as REAUTHORIZATION_REQUIRED later if needed
    }

    if (authResult.accessToken) {
      const accessContext = { ...encryptionContext, credentialType: 'access_token' as const };
      const encryptedAccess = ProviderCredentialVault.encrypt(
        authResult.accessToken,
        accessContext,
      );
      encryptedAccessToken = JSON.stringify(encryptedAccess);
    }

    let status = ConnectedAccountStatus.ACTIVE;
    if (!encryptedRefreshToken) {
      status = ConnectedAccountStatus.REAUTHORIZATION_REQUIRED;
    }

    let connectedAccount: ConnectedAccount;

    // Upsert or replace
    if (existingUserLink) {
      if (existingUserLink.providerAccountId !== authResult.providerAccountId) {
        // Replacing a different Google account entirely
        connectedAccount = await prisma.connectedAccount.update({
          where: { id: existingUserLink.id },
          data: {
            providerAccountId: authResult.providerAccountId,
            emailAddress: authResult.emailAddress,
            displayName: authResult.displayName,
            avatarUrl: authResult.avatarUrl,
            grantedScopes: authResult.grantedScopes,
            encryptedRefreshToken,
            encryptedAccessToken,
            accessTokenExpiresAt: authResult.accessTokenExpiresInSeconds
              ? new Date(Date.now() + authResult.accessTokenExpiresInSeconds * 1000)
              : null,
            credentialKeyId: env.GOOGLE_TOKEN_ENCRYPTION_KEY_ID || 'v1',
            status,
            lastAuthorizedAt: new Date(),
            revokedAt: null,
          },
        });
      } else {
        // Updating the existing link
        connectedAccount = await prisma.connectedAccount.update({
          where: { id: existingUserLink.id },
          data: {
            emailAddress: authResult.emailAddress,
            displayName: authResult.displayName,
            avatarUrl: authResult.avatarUrl,
            grantedScopes: authResult.grantedScopes,
            ...(encryptedRefreshToken ? { encryptedRefreshToken } : {}),
            ...(encryptedAccessToken ? { encryptedAccessToken } : {}),
            ...(authResult.accessTokenExpiresInSeconds
              ? {
                  accessTokenExpiresAt: new Date(
                    Date.now() + authResult.accessTokenExpiresInSeconds * 1000,
                  ),
                }
              : {}),
            status,
            lastAuthorizedAt: new Date(),
            revokedAt: null,
          },
        });
      }
    } else {
      // Create new link
      connectedAccount = await prisma.connectedAccount.create({
        data: {
          userId,
          provider,
          providerAccountId: authResult.providerAccountId,
          emailAddress: authResult.emailAddress,
          displayName: authResult.displayName,
          avatarUrl: authResult.avatarUrl,
          grantedScopes: authResult.grantedScopes,
          encryptedRefreshToken,
          encryptedAccessToken,
          accessTokenExpiresAt: authResult.accessTokenExpiresInSeconds
            ? new Date(Date.now() + authResult.accessTokenExpiresInSeconds * 1000)
            : null,
          credentialKeyId: env.GOOGLE_TOKEN_ENCRYPTION_KEY_ID || 'v1',
          status,
          lastAuthorizedAt: new Date(),
        },
      });
    }

    logger.info({
      action: 'GOOGLE_CONNECTION_COMPLETED',
      userId,
      connectedAccountId: connectedAccount.id,
      provider,
    });

    return connectedAccount;
  }

  /**
   * Revokes the connection and purges the stored credentials.
   */
  public static async disconnectAccount(userId: number, accountId: number): Promise<void> {
    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== userId) {
      throw new AppError('Connected account not found', 404, 'CONNECTED_ACCOUNT_NOT_FOUND');
    }

    // Try remote revocation if possible, but don't fail if it doesn't work
    const adapter = this.getAdapter(account.provider);
    try {
      await adapter.revokeCredentials({
        credentialKeyId: account.credentialKeyId,
        encryptedRefreshToken: account.encryptedRefreshToken || undefined,
        encryptedAccessToken: account.encryptedAccessToken || undefined,
      });
    } catch (err) {
      logger.warn(
        { err, accountId },
        'Remote credential revocation failed, but local purge will continue',
      );
    }

    await prisma.connectedAccount.update({
      where: { id: accountId },
      data: {
        encryptedRefreshToken: null,
        encryptedAccessToken: null,
        status: ConnectedAccountStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    logger.info({
      action: 'GOOGLE_CONNECTION_REVOKED',
      userId,
      connectedAccountId: accountId,
      provider: account.provider,
    });
  }

  /**
   * Retrieves all connected accounts for a user (without credentials).
   */
  public static async getUserAccounts(
    userId: number,
  ): Promise<Omit<ConnectedAccount, 'encryptedRefreshToken' | 'encryptedAccessToken'>[]> {
    const accounts = await prisma.connectedAccount.findMany({
      where: { userId },
      select: {
        id: true,
        userId: true,
        provider: true,
        providerAccountId: true,
        emailAddress: true,
        displayName: true,
        avatarUrl: true,
        grantedScopes: true,
        status: true,
        connectedAt: true,
        lastAuthorizedAt: true,
        lastRefreshedAt: true,
        reauthorizationRequiredAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
        credentialKeyId: true,
        accessTokenExpiresAt: true,
      },
    });

    return accounts as unknown as Omit<
      ConnectedAccount,
      'encryptedRefreshToken' | 'encryptedAccessToken'
    >[];
  }

  private static getAdapter(provider: ConnectedAccountProvider) {
    if (provider === ConnectedAccountProvider.GOOGLE) {
      return this.googleAdapter;
    }
    throw new AppError('Unsupported provider', 400, 'CONNECTED_ACCOUNT_PROVIDER_CONFLICT');
  }
}
