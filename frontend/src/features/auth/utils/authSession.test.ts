import { beforeEach, describe, expect, it } from 'vitest';

import { STORAGE_KEYS } from '@/constants/storage';
import type { User } from '@/features/auth/types/auth.types';

import {
  clearAuthSession,
  getAccessToken,
  hasAuthSession,
  persistAuthSession,
  setAccessToken,
} from './authSession';

const user: User = {
  email: 'ada@example.com',
  id: '1',
  name: 'Ada Lovelace',
  role: 'user',
};

describe('authSession', () => {
  beforeEach(() => {
    clearAuthSession();
    localStorage.clear();
  });

  it('keeps the access token in memory and never writes it to localStorage', () => {
    persistAuthSession('secret-token', user);

    expect(getAccessToken()).toBe('secret-token');
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) ?? 'null')).toMatchObject({
      email: user.email,
      id: user.id,
    });
    expect(hasAuthSession()).toBe(true);
  });

  it('clears legacy access tokens left in localStorage', () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, JSON.stringify('legacy-token'));

    persistAuthSession('fresh-token', user);

    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(getAccessToken()).toBe('fresh-token');
  });

  it('setAccessToken updates memory without touching localStorage', () => {
    setAccessToken('memory-only');

    expect(getAccessToken()).toBe('memory-only');
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
  });
});
