import { STORAGE_KEYS } from '@/constants/storage';
import type { User } from '@/features/auth/types/auth.types';
import { storage } from '@/utils/storage';

export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';

let sessionAllowed = true;

export function isAuthSessionAllowed(): boolean {
  return sessionAllowed;
}

export function allowAuthSession(): void {
  sessionAllowed = true;
}

export function getAccessToken(): string | null {
  return storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
}

export function setAccessToken(accessToken: string): void {
  if (!sessionAllowed) return;
  storage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
}

export function getStoredUser(): User | null {
  return storage.get<User>(STORAGE_KEYS.USER);
}

export function persistAuthSession(accessToken: string, user: User): void {
  sessionAllowed = true;
  storage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  storage.set(STORAGE_KEYS.USER, user);
  storage.set(STORAGE_KEYS.USER_ID, user.id);
}

export function clearAuthSession(): void {
  storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
  storage.remove(STORAGE_KEYS.USER);
  storage.remove(STORAGE_KEYS.USER_ID);
}

export function invalidateAuthSession(): void {
  sessionAllowed = false;
  clearAuthSession();
}

export function hasAuthSession(): boolean {
  return Boolean(getAccessToken() && getStoredUser());
}

export function notifyAuthSessionExpired(): void {
  invalidateAuthSession();
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}
