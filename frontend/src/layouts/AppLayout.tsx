import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import type { SidebarVariant } from '@/components/organisms/Sidebar/interfaces';

import { useLogout } from '@/features/auth/hooks/useLogout';
import { useAppSelector } from '@/hooks/redux';

import { AppHeader, CareerCopilot, Sidebar } from '@/components';
import { ROUTES } from '@/constants/routes';
import { CopilotSessionProvider } from '@/features/copilot';
import { useMediaQuery } from '@/lib/material';

export function AppLayout() {
  const isMobile = useMediaQuery('(max-width: 760px)');
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [sidebarVariant, setSidebarVariant] = useState<SidebarVariant>('open');
  const activeItemId =
    pathname === ROUTES.SAVED_JOBS
      ? 'saved-jobs'
      : pathname === ROUTES.FOR_YOU
        ? 'for-you'
        : pathname === ROUTES.APPLICATIONS
          ? 'applications'
          : pathname === ROUTES.JOB_FEED || pathname.startsWith('/jobs/')
            ? 'jobs-feed' : pathname === ROUTES.SAVED_RESUMES || pathname.startsWith(`${ROUTES.SAVED_RESUMES}/`)
        ? 'saved-resumes'
        : pathname.startsWith(ROUTES.RESUME_BUILDER)
          ? 'resume-builder'
          : 'dashboard';
          
  const { isLoggingOut, logout } = useLogout();
  const user = useAppSelector((state) => state.auth.user);
  const userName = user?.name ?? user?.email ?? 'User';
  const userRoleLabel = user?.role === 'admin' || user?.role === 'ADMIN' ? 'Admin' : undefined;
  return (
    <CopilotSessionProvider>
      <div className="app-shell">
        <Sidebar
          activeItemId={activeItemId}
          mobileMode={isMobile ? 'bottomNav' : undefined}
          onVariantChange={setSidebarVariant}
          variant={sidebarVariant}
        />
        <div className="content-shell">
          <AppHeader
            onLogoutClick={() => {
              if (!isLoggingOut) {
                void logout();
              }
            }}
            onSettingsClick={() => void navigate(ROUTES.PROFILE_EDIT)}
            userAvatarUrl={user?.profileImage ?? undefined}
            userName={userName}
            userRoleLabel={userRoleLabel}
          />
          <main className="main-content">
            <Outlet />
          </main>
        </div>
        <CareerCopilot />
      </div>
    </CopilotSessionProvider>
  );
}
