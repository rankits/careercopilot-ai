import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import type { SidebarVariant } from '@/components/organisms/Sidebar/interfaces';

import { Sidebar } from '@/components';
import { useMediaQuery } from '@/lib/material';

export function AppLayout() {
  const isMobile = useMediaQuery('(max-width: 760px)');
  const [sidebarVariant, setSidebarVariant] = useState<SidebarVariant>('open');

  return (
    <div className="app-shell">
      <Sidebar
        mobileMode={isMobile ? 'bottomNav' : undefined}
        onVariantChange={setSidebarVariant}
        variant={sidebarVariant}
      />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
