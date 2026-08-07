import {
  ConnectedAccountProvider,
  ConnectedAccountStatus,
  type ConnectedAccount,
} from '@prisma/client';

import { prisma } from '@/shared/config/db.conf.js';
import { env } from '@/shared/config/env.conf.js';
import { logger } from '@/shared/logger/logger.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

import { GoogleOAuthAdapter } from '@/modules/connected-accounts/providers/GoogleOAuthAdapter.js';
import {
  ProviderCredentialVault,
  type EncryptedSecret,
  type EncryptedSecretContext,
} from '@/modules/connected-accounts/services/ProviderCredentialVault.js';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

export interface SendableGoogleAccountMeta {
  id: number;
  userId: number;
  provider: ConnectedAccountProvider;
  providerAccountId: string;
  emailAddress: string;
  displayName: string | null;
  status: ConnectedAccountStatus;
  grantedScopes: string[];
}

export interface ResolvedSendableGoogleAccount {
  account: SendableGoogleAccountMeta;
  accessToken: string;
}

const parseEncryptedSecret = (raw: string): EncryptedSecret => {
  try {
    return JSON.parse(raw) as EncryptedSecret;
  } catch {
    throw new AppError(
      'Stored credential is corrupted',
      500,
      'CONNECTED_ACCOUNT_CREDENTIAL_CORRUPT',
    );
  }
};

const toMeta = (account: ConnectedAccount): SendableGoogleAccountMeta => ({
  id: account.id,
  userId: account.userId,
  provider: account.provider,
  providerAccountId: account.providerAccountId,
  emailAddress: account.emailAddress,
  displayName: account.displayName,
  status: account.status,
  grantedScopes: account.grantedScopes,
});

const hasGmailSendScope = (scopes: string[]): boolean =>
  scopes.some((scope) => scope === GMAIL_SEND_SCOPE || scope.endsWith('/gmail.send'));

/**
 * Internal credential accessor for mailbox delivery.
 * Never expose plaintext tokens over HTTP.
 */
export class ConnectedAccountCredentialService {
  private static googleAdapter = new GoogleOAuthAdapter();

  public static async resolveSendableGoogleAccount(input: {
    userId: number;
    accountId: number;
  }): Promise<ResolvedSendableGoogleAccount> {
    if (!env.GOOGLE_GMAIL_ENABLED) {
      throw new AppError('Google mailbox linking is disabled', 403, 'GOOGLE_OAUTH_DISABLED');
    }

    const account = await prisma.connectedAccount.findUnique({
      where: { id: input.accountId },
    });

    if (!account || account.userId !== input.userId) {
      throw new AppError('Connected account not found', 404, 'CONNECTED_ACCOUNT_NOT_FOUND');
    }

    if (account.provider !== ConnectedAccountProvider.GOOGLE) {
      throw new AppError(
        'Only Google mailbox accounts can send mail',
        400,
        'MAIL_PROVIDER_UNSUPPORTED',
      );
    }

    if (account.status === ConnectedAccountStatus.REVOKED) {
      throw new AppError('Connected account has been revoked', 403, 'CONNECTED_ACCOUNT_REVOKED');
    }

    if (
      account.status === ConnectedAccountStatus.REAUTHORIZATION_REQUIRED ||
      account.status === ConnectedAccountStatus.ERROR ||
      account.status === ConnectedAccountStatus.PENDING
    ) {
      throw new AppError(
        'Connected account requires reauthorization before sending',
        403,
        'CONNECTED_ACCOUNT_REAUTH_REQUIRED',
      );
    }

    if (account.status !== ConnectedAccountStatus.ACTIVE) {
      throw new AppError('Connected account is not active', 403, 'CONNECTED_ACCOUNT_INACTIVE');
    }

    if (!hasGmailSendScope(account.grantedScopes)) {
      throw new AppError(
        'Connected account is missing the gmail.send scope',
        403,
        'CONNECTED_ACCOUNT_MISSING_GMAIL_SEND_SCOPE',
      );
    }

    if (!account.encryptedRefreshToken && !account.encryptedAccessToken) {
      throw new AppError(
        'Connected account has no usable credentials',
        403,
        'CONNECTED_ACCOUNT_REAUTH_REQUIRED',
      );
    }

    const accessToken = await this.getValidAccessToken(account);
    return { account: toMeta(account), accessToken };
  }

  /**
   * Preview-safe metadata check (no token decrypt).
   */
  public static async getSendableGoogleAccountMeta(input: {
    userId: number;
    accountId: number;
  }): Promise<SendableGoogleAccountMeta> {
    const account = await prisma.connectedAccount.findUnique({
      where: { id: input.accountId },
    });

    if (!account || account.userId !== input.userId) {
      throw new AppError('Connected account not found', 404, 'CONNECTED_ACCOUNT_NOT_FOUND');
    }

    if (account.provider !== ConnectedAccountProvider.GOOGLE) {
      throw new AppError(
        'Only Google mailbox accounts can send mail',
        400,
        'MAIL_PROVIDER_UNSUPPORTED',
      );
    }

    return toMeta(account);
  }

  private static async getValidAccessToken(account: ConnectedAccount): Promise<string> {
    const skewMs = env.GOOGLE_TOKEN_REFRESH_SKEW_SECONDS * 1000;
    const expiresAt = account.accessTokenExpiresAt?.getTime() ?? 0;
    const accessStillValid =
      Boolean(account.encryptedAccessToken) && expiresAt - skewMs > Date.now();

    if (accessStillValid && account.encryptedAccessToken) {
      return this.decryptToken(account, 'access_token', account.encryptedAccessToken);
    }

    if (!account.encryptedRefreshToken) {
      await this.markReauthRequired(account.id);
      throw new AppError(
        'Connected account requires reauthorization before sending',
        403,
        'CONNECTED_ACCOUNT_REAUTH_REQUIRED',
      );
    }

    const refreshToken = this.decryptToken(account, 'refresh_token', account.encryptedRefreshToken);

    try {
      const refreshed = await this.googleAdapter.refreshCredentials({ refreshToken });
      const accessContext: EncryptedSecretContext = {
        userId: account.userId,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        credentialType: 'access_token',
      };
      const encryptedAccess = ProviderCredentialVault.encrypt(
        refreshed.newAccessToken,
        accessContext,
      );

      const updateData: {
        encryptedAccessToken: string;
        accessTokenExpiresAt: Date;
        lastRefreshedAt: Date;
        encryptedRefreshToken?: string;
        status: ConnectedAccountStatus;
        reauthorizationRequiredAt: null;
      } = {
        encryptedAccessToken: JSON.stringify(encryptedAccess),
        accessTokenExpiresAt: new Date(
          Date.now() + refreshed.newAccessTokenExpiresInSeconds * 1000,
        ),
        lastRefreshedAt: new Date(),
        status: ConnectedAccountStatus.ACTIVE,
        reauthorizationRequiredAt: null,
      };

      if (refreshed.newRefreshToken) {
        const refreshContext: EncryptedSecretContext = {
          ...accessContext,
          credentialType: 'refresh_token',
        };
        updateData.encryptedRefreshToken = JSON.stringify(
          ProviderCredentialVault.encrypt(refreshed.newRefreshToken, refreshContext),
        );
      }

      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: updateData,
      });

      return refreshed.newAccessToken;
    } catch (err) {
      logger.warn(
        {
          err,
          connectedAccountId: account.id,
          userId: account.userId,
          action: 'GOOGLE_TOKEN_REFRESH_FAILED',
        },
        'Google access token refresh failed',
      );
      await this.markReauthRequired(account.id);
      if (err instanceof AppError) throw err;
      throw new AppError(
        'Connected account requires reauthorization before sending',
        403,
        'CONNECTED_ACCOUNT_REAUTH_REQUIRED',
      );
    }
  }

  private static decryptToken(
    account: ConnectedAccount,
    credentialType: 'refresh_token' | 'access_token',
    encryptedRaw: string,
  ): string {
    const secret = parseEncryptedSecret(encryptedRaw);
    const context: EncryptedSecretContext = {
      userId: account.userId,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      credentialType,
    };
    try {
      return ProviderCredentialVault.decrypt(secret, context);
    } catch {
      throw new AppError(
        'Failed to decrypt connected account credentials',
        500,
        'CONNECTED_ACCOUNT_CREDENTIAL_DECRYPT_FAILED',
      );
    }
  }

  private static async markReauthRequired(accountId: number): Promise<void> {
    await prisma.connectedAccount.update({
      where: { id: accountId },
      data: {
        status: ConnectedAccountStatus.REAUTHORIZATION_REQUIRED,
        reauthorizationRequiredAt: new Date(),
      },
    });
  }
}
