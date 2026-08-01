import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks/redux';

import { setSessionResolved } from '@/features/auth/authSlice';

/**
 * Resolves the auth gate using the cached session + profile flag from login.
 * Profile creation status is provided by the login API (`isProfileCreated`),
 * so no extra profile lookup is performed here.
 */
export function useAuthBootstrap() {
  const dispatch = useAppDispatch();
  const isSessionResolved = useAppSelector((state) => state.auth.isSessionResolved);

  useEffect(() => {
    if (!isSessionResolved) {
      dispatch(setSessionResolved(true));
    }
  }, [dispatch, isSessionResolved]);

  return { isSessionResolved };
}
