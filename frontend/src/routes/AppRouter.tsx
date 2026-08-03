import { Route, Routes } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';
import { AppLayout } from '@/layouts/AppLayout';
import { ApplicationsPage } from '@/pages/ApplicationsPage';
import { ForYouPage } from '@/pages/ForYouPage';
import { HomePage } from '@/pages/HomePage';
import { JobDetailPage } from '@/pages/JobDetailPage';
import { JobFeedPage } from '@/pages/JobFeedPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ResumeBuilderPage } from '@/pages/ResumeBuilderPage';
import { SavedJobsPage } from '@/pages/SavedJobsPage';
import { SavedResumesPage } from '@/pages/SavedResumesPage';
import {
  GuestRoute,
  OnboardingRoute,
  ProtectedRoute,
  RootRedirect,
} from '@/routes/guards/AuthGuards';

export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<RootRedirect />} />

      <Route element={<GuestRoute />}>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      </Route>

      <Route element={<OnboardingRoute />}>
        <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<HomePage />} />
          <Route path={ROUTES.JOB_FEED} element={<JobFeedPage />} />
          <Route path={ROUTES.JOB_DETAIL} element={<JobDetailPage />} />
          <Route path={ROUTES.FOR_YOU} element={<ForYouPage />} />
          <Route path={ROUTES.SAVED_JOBS} element={<SavedJobsPage />} />
          <Route path={ROUTES.APPLICATIONS} element={<ApplicationsPage />} />
          <Route path={ROUTES.SAVED_RESUMES} element={<SavedResumesPage />} />
          <Route path={ROUTES.RESUME_BUILDER} element={<ResumeBuilderPage />} />
          <Route path={`${ROUTES.RESUME_BUILDER}/:resumeId`} element={<ResumeBuilderPage />} />
          <Route path={ROUTES.PROFILE_EDIT} element={<ProfilePage mode="edit" />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
