import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import type { SidebarVariant } from '@/components/organisms/Sidebar/interfaces';

import { AppHeader, Sidebar } from '@/components';
import { ROUTES } from '@/constants/routes';
import { useMediaQuery } from '@/lib/material';

export function AppLayout() {
  const isMobile = useMediaQuery('(max-width: 760px)');
  const { pathname } = useLocation();
  const [sidebarVariant, setSidebarVariant] = useState<SidebarVariant>('open');
  const activeItemId = pathname === ROUTES.JOB_FEED ? 'jobs-feed' : 'dashboard';

  return (
    <div className="app-shell">
      <Sidebar
        activeItemId={activeItemId}
        mobileMode={isMobile ? 'bottomNav' : undefined}
        onVariantChange={setSidebarVariant}
        variant={sidebarVariant}
      />
      <div className="content-shell">
        <AppHeader />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
