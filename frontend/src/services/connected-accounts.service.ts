import { httpClient } from './httpClient';

export interface ConnectedAccount {
  id: number;
  userId: number;
  provider: 'GOOGLE' | 'MICROSOFT' | 'OTHER_FUTURE_PROVIDER';
  providerAccountId: string;
  emailAddress: string;
  displayName: string | null;
  avatarUrl: string | null;
  grantedScopes: string[];
  status: 'PENDING' | 'ACTIVE' | 'REAUTHORIZATION_REQUIRED' | 'REVOKED' | 'ERROR';
  connectedAt: string;
  lastAuthorizedAt: string | null;
  lastRefreshedAt: string | null;
  reauthorizationRequiredAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type Envelope<T> = {
  data: T;
  message?: string;
};

export const connectedAccountsService = {
  getAccounts: async (): Promise<ConnectedAccount[]> => {
    const { data } = await httpClient.get<Envelope<ConnectedAccount[]>>('/connected-accounts');
    return data.data;
  },

  getGoogleAuthUrl: async (returnPath: string): Promise<string> => {
    const { data } = await httpClient.post<Envelope<{ url: string }>>(
      '/connected-accounts/google/authorize',
      { returnPath },
    );
    return data.data.url;
  },

  handleGoogleCallback: async (state: string, code: string): Promise<ConnectedAccount> => {
    const { data } = await httpClient.post<Envelope<ConnectedAccount>>(
      '/connected-accounts/google/callback',
      { state, code },
    );
    return data.data;
  },

  disconnectAccount: async (accountId: number): Promise<void> => {
    await httpClient.delete(`/connected-accounts/${accountId}`);
  },
};
