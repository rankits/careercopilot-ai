import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks/redux';

import { establishSession, logout, setSessionResolved } from '@/features/auth/authSlice';
import { authService } from '@/features/auth/services/auth.service';
import {
  allowAuthSession,
  getStoredUser,
  setAccessToken,
} from '@/features/auth/utils/authSession';

const BOOTSTRAP_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Auth bootstrap timed out'));
    }, ms);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/**
 * Restores the session from the httpOnly refresh cookie on first load.
 * Access tokens stay in memory only — never localStorage.
 *
 * Important: do not gate on a "already started" ref. React Strict Mode runs
 * effect → cleanup → effect; a sticky ref leaves the first run cancelled and
 * the second skipped, so the UI stays on RouteLoading forever.
 */
export function useAuthBootstrap() {
  const dispatch = useAppDispatch();
  const isSessionResolved = useAppSelector((state) => state.auth.isSessionResolved);

  useEffect(() => {
    if (isSessionResolved) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      allowAuthSession();

      try {
        const { accessToken } = await withTimeout(
          authService.refreshSession(),
          BOOTSTRAP_TIMEOUT_MS,
        );
        if (cancelled) return;

        setAccessToken(accessToken);

        const cachedUser = getStoredUser();
        const user = cachedUser ?? (await withTimeout(authService.getCurrentUser(), BOOTSTRAP_TIMEOUT_MS));
        if (cancelled) return;

        dispatch(
          establishSession({
            accessToken,
            user,
          }),
        );
      } catch {
        if (cancelled) return;
        dispatch(logout());
        dispatch(setSessionResolved(true));
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [dispatch, isSessionResolved]);

  return { isSessionResolved };
}
