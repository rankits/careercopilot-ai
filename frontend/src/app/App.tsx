import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@/hooks/redux';

import { ROUTES } from '@/constants/routes';
import { logout } from '@/features/auth/authSlice';
import { AUTH_SESSION_EXPIRED_EVENT } from '@/features/auth/utils/authSession';

export function App() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const handleSessionExpired = () => {
      dispatch(logout());
      void navigate(ROUTES.LOGIN, { replace: true });
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [dispatch, navigate]);

  return <Outlet />;
}
