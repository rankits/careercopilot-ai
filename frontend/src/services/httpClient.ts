import axios, { type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/config/env';
import { STORAGE_KEYS } from '@/constants/storage';
import { storage } from '@/utils/storage';

export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const REFRESH_TOKEN_URL = '/auth/refresh-token';

type UnauthorizedHandler = () => void;
type TokenRefreshedHandler = (accessToken: string) => void;

let onUnauthorized: UnauthorizedHandler | null = null;
let onTokenRefreshed: TokenRefreshedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  onUnauthorized = handler;
};

export const setTokenRefreshedHandler = (handler: TokenRefreshedHandler) => {
  onTokenRefreshed = handler;
};

httpClient.interceptors.request.use((config) => {
  const token = storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<string> | null = null;

/** De-dupes concurrent 401s into a single in-flight refresh call. */
const refreshAccessToken = (): Promise<string> => {
  refreshPromise ??= axios
    .post<{ accessToken: string }>(
      `${env.apiBaseUrl}${REFRESH_TOKEN_URL}`,
      {},
      { withCredentials: true },
    )
    .then(({ data }) => {
      storage.set(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
      onTokenRefreshed?.(data.accessToken);
      return data.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

httpClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const config = error.config as RetriableRequestConfig | undefined;
      const isRefreshCall = config?.url?.includes(REFRESH_TOKEN_URL);
      const wasAuthenticatedRequest = Boolean(config?.headers?.Authorization);

      if (config && !config._retry && !isRefreshCall && wasAuthenticatedRequest) {
        config._retry = true;
        try {
          const accessToken = await refreshAccessToken();
          config.headers.Authorization = `Bearer ${accessToken}`;
          return await httpClient(config);
        } catch {
          onUnauthorized?.();
          return Promise.reject(error instanceof Error ? error : new Error('HTTP request failed'));
        }
      }

      onUnauthorized?.();
    }
    return Promise.reject(error instanceof Error ? error : new Error('HTTP request failed'));
  },
);
