import { Navigate, Outlet } from 'react-router-dom';

import { RouteLoading } from '@/routes/components/RouteLoading';

import { useAuthBootstrap } from '@/features/auth/hooks/useAuthBootstrap';
import { useAppSelector } from '@/hooks/redux';

import { ROUTES } from '@/constants/routes';
import { getPostAuthRoute } from '@/features/auth/utils/getPostAuthRoute';

export function ProtectedRoute() {
  const { isSessionResolved } = useAuthBootstrap();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isProfileComplete = useAppSelector((state) => state.auth.isProfileComplete);

  if (!isSessionResolved) {
    return <RouteLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate replace to={ROUTES.LOGIN} />;
  }

  if (!isProfileComplete) {
    return <Navigate replace to={ROUTES.PROFILE} />;
  }

  return <Outlet />;
}

/** Login / register — reachable even when already signed in (e.g. switch account). */
export function GuestRoute() {
  const { isSessionResolved } = useAuthBootstrap();

  if (!isSessionResolved) {
    return <RouteLoading />;
  }

  return <Outlet />;
}

/**
 * Guards the resume-upload/create-profile page. Only requires
 * authentication - unlike `ProtectedRoute`, it does NOT redirect away once
 * `isProfileComplete` is true, because that page doubles as "upload a new
 * resume and replace my profile" for already-onboarded users (reachable via
 * the header menu / Edit Profile page), not just first-time onboarding.
 */
export function OnboardingRoute() {
  const { isSessionResolved } = useAuthBootstrap();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  if (!isSessionResolved) {
    return <RouteLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate replace to={ROUTES.LOGIN} />;
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
