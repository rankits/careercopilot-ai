import { useState } from 'react';

import type { SidebarVariant } from '@/components/organisms/Sidebar/interfaces';

import { AppHeader, Sidebar } from '@/components';
import { useMediaQuery } from '@/lib/material';

export function HomePage() {
  const isMobile = useMediaQuery('(max-width: 760px)');
  const [sidebarVariant, setSidebarVariant] = useState<SidebarVariant>('open');

  return (
    <div className="app-shell">
      <Sidebar
        mobileMode={isMobile ? 'bottomNav' : undefined}
        onVariantChange={setSidebarVariant}
        variant={sidebarVariant}
      />
      <div className="content-shell">
        <AppHeader />
        <main className="main-content">
          <section aria-label="Home page" className="home-content">
            <p className="eyebrow">Career workspace</p>
            <div className="profile-card">
              <p>Welcome back. Your dashboard, jobs, and recommendations live here.</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
