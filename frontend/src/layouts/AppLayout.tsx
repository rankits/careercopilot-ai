import { NavLink, Outlet } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">CareerCopilot</div>
          <nav className="nav-list">
            <NavLink to={ROUTES.PROFILE}>Profile</NavLink>
          </nav>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
