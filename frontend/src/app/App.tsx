import { useEffect } from 'react';

import { useAppDispatch } from '@/hooks/redux';

import { logout } from '@/features/auth/authSlice';
import { AUTH_SESSION_EXPIRED_EVENT } from '@/features/auth/utils/authSession';
import { AppRouter } from '@/routes/AppRouter';

export function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleSessionExpired = () => {
      dispatch(logout());
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [dispatch]);

  return <AppRouter />;
}
