import { Navigate, Route, Routes } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';
import { AppLayout } from '@/layouts/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { JobFeedPage } from '@/pages/JobFeedPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RegisterPage } from '@/pages/RegisterPage';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.JOB_FEED} element={<JobFeedPage />} />
        <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
      </Route>
      <Route path="/app" element={<Navigate to={ROUTES.PROFILE} replace />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
