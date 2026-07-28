import axios from 'axios';

import { env } from '@/config/env';
import { STORAGE_KEYS } from '@/constants/storage';
import { storage } from '@/utils/storage';

export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use((config) => {
  const token = storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) =>
    Promise.reject(error instanceof Error ? error : new Error('HTTP request failed')),
);
