import { STORAGE_KEYS } from '@/constants/storage';
import type { User } from '@/features/auth/types/auth.types';
import { storage } from '@/utils/storage';

export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';

export function getAccessToken(): string | null {
  return storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
}

export function getStoredUser(): User | null {
  return storage.get<User>(STORAGE_KEYS.USER);
}

export function persistAuthSession(accessToken: string, user: User): void {
  storage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  storage.set(STORAGE_KEYS.USER, user);
  storage.set(STORAGE_KEYS.USER_ID, user.id);
}

export function clearAuthSession(): void {
  storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
  storage.remove(STORAGE_KEYS.USER);
  storage.remove(STORAGE_KEYS.USER_ID);
}

export function hasAuthSession(): boolean {
  return Boolean(getAccessToken() && getStoredUser());
}

export function notifyAuthSessionExpired(): void {
  clearAuthSession();
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}
