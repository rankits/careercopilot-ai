import { Navigate, Route, Routes } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';
import { AppLayout } from '@/layouts/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';

export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<HomePage />} />
      <Route element={<AppLayout />}>
        <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
      </Route>
      <Route path="/app" element={<Navigate to={ROUTES.PROFILE} replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
