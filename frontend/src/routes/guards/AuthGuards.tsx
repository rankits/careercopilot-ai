import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { RouteLoading } from '@/routes/components/RouteLoading';

import { useAuthBootstrap } from '@/features/auth/hooks/useAuthBootstrap';
import { useAppSelector } from '@/hooks/redux';

import { ROUTES } from '@/constants/routes';
import { getPostAuthRoute } from '@/features/auth/utils/getPostAuthRoute';

export function ProtectedRoute() {
  const location = useLocation();
  const { isSessionResolved } = useAuthBootstrap();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isProfileComplete = useAppSelector((state) => state.auth.isProfileComplete);

  if (!isSessionResolved) {
    return <RouteLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to={ROUTES.LOGIN} />;
  }

  if (!isProfileComplete) {
    return <Navigate replace to={ROUTES.PROFILE} />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { isSessionResolved } = useAuthBootstrap();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isProfileComplete = useAppSelector((state) => state.auth.isProfileComplete);

  if (!isSessionResolved) {
    return <RouteLoading />;
  }

  if (isAuthenticated) {
    return <Navigate replace to={getPostAuthRoute(isProfileComplete)} />;
  }

  return <Outlet />;
}

export function OnboardingRoute() {
  const { isSessionResolved } = useAuthBootstrap();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isProfileComplete = useAppSelector((state) => state.auth.isProfileComplete);

  if (!isSessionResolved) {
    return <RouteLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate replace to={ROUTES.LOGIN} />;
  }

  if (isProfileComplete) {
    return <Navigate replace to={ROUTES.JOB_FEED} />;
  }

  return <Outlet />;
}

export function RootRedirect() {
  const { isSessionResolved } = useAuthBootstrap();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isProfileComplete = useAppSelector((state) => state.auth.isProfileComplete);

  if (!isSessionResolved) {
    return <RouteLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate replace to={ROUTES.LOGIN} />;
  }

  return <Navigate replace to={getPostAuthRoute(isProfileComplete)} />;
}
