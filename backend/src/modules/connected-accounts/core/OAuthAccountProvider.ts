import { ConnectedAccountProvider } from '@prisma/client';

export interface CreateAuthorizationRequest {
  state: string; // The opaque state string to pass to the provider
  returnPath: string; // Our internal callback path to pass as redirect_uri if needed
  pkceChallenge?: string; // Optional PKCE S256 challenge
}

export interface AuthorizationRequestResult {
  authorizationUrl: string;
}

export interface ExchangeAuthorizationCodeRequest {
  code: string;
  returnPath: string; // Must match the redirect_uri used in the authorization request
  pkceVerifier?: string;
}

export interface ProviderAuthorizationResult {
  providerAccountId: string; // Immutable unique ID from the provider (e.g. Google 'sub' claim)
  emailAddress: string;
  displayName?: string;
  avatarUrl?: string;
  grantedScopes: string[];

  // The raw tokens to be encrypted and stored by the vault
  refreshToken?: string; // May be omitted by Google on re-auth
  accessToken?: string;
  accessTokenExpiresInSeconds?: number;
}

export interface EncryptedProviderCredentials {
  credentialKeyId: string;
  encryptedRefreshToken?: string;
  encryptedAccessToken?: string;
}

export interface ProviderCredentialRefreshResult {
  newAccessToken: string;
  newAccessTokenExpiresInSeconds: number;
  newRefreshToken?: string; // If the provider rotates the refresh token
}

export interface ProviderHealthResult {
  status: 'ok' | 'degraded' | 'down';
  message?: string;
}

export interface OAuthAccountProvider {
  readonly provider: ConnectedAccountProvider;

  createAuthorizationRequest(
    request: CreateAuthorizationRequest,
  ): Promise<AuthorizationRequestResult>;

  exchangeAuthorizationCode(
    request: ExchangeAuthorizationCodeRequest,
  ): Promise<ProviderAuthorizationResult>;

  /**
   * Refresh using a plaintext refresh token (decrypted by the credential vault /
   * ConnectedAccountCredentialService — never pass encrypted blobs here).
   */
  refreshCredentials?(input: { refreshToken: string }): Promise<ProviderCredentialRefreshResult>;

  revokeCredentials(credentials: EncryptedProviderCredentials): Promise<void>;

  healthCheck(): Promise<ProviderHealthResult>;
}
