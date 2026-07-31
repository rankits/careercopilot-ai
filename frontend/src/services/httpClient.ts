import axios from 'axios';

import { env } from '@/config/env';
import { ROUTES } from '@/constants/routes';
import { getAccessToken, notifyAuthSessionExpired } from '@/features/auth/utils/authSession';

export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  onUnauthorized = handler;
};

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      notifyAuthSessionExpired();
      onUnauthorized?.();

      const isAuthRoute =
        window.location.pathname === ROUTES.LOGIN || window.location.pathname === ROUTES.REGISTER;

      if (!isAuthRoute) {
        const returnTo = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
        window.location.assign(`${ROUTES.LOGIN}?returnTo=${returnTo}`);
      }
    }

    return Promise.reject(error instanceof Error ? error : new Error('HTTP request failed'));
  },
);
