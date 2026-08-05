/* eslint-disable react-refresh/only-export-components -- router config and component share this module */
import { createBrowserRouter, useRoutes, type RouteObject } from 'react-router-dom';

import { App } from '@/app/App';
import { ROUTES } from '@/constants/routes';
import { AppLayout } from '@/layouts/AppLayout';
import { ApplicationDetailPage } from '@/pages/ApplicationDetailPage';
import { ApplicationsPage } from '@/pages/ApplicationsPage';
import { AutoApplyPage } from '@/pages/AutoApplyPage';
import { EditProfilePage } from '@/pages/EditProfilePage';
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

/** Shared route tree for the data router and for MemoryRouter-based tests. */
export const appRouteObjects: RouteObject[] = [
  { path: ROUTES.HOME, element: <RootRedirect /> },
  {
    element: <GuestRoute />,
    children: [
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: ROUTES.REGISTER, element: <RegisterPage /> },
    ],
  },
  {
    element: <OnboardingRoute />,
    children: [{ path: ROUTES.PROFILE, element: <ProfilePage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: ROUTES.DASHBOARD, element: <HomePage /> },
          { path: ROUTES.JOB_FEED, element: <JobFeedPage /> },
          { path: ROUTES.JOB_DETAIL, element: <JobDetailPage /> },
          { path: ROUTES.FOR_YOU, element: <ForYouPage /> },
          { path: ROUTES.SAVED_JOBS, element: <SavedJobsPage /> },
          { path: ROUTES.APPLICATIONS, element: <ApplicationsPage /> },
          { path: ROUTES.AUTO_APPLY, element: <AutoApplyPage /> },
          { path: ROUTES.SAVED_RESUMES, element: <SavedResumesPage /> },
          { path: ROUTES.RESUME_BUILDER, element: <ResumeBuilderPage /> },
          { path: `${ROUTES.RESUME_BUILDER}/:resumeId`, element: <ResumeBuilderPage /> },
          { path: ROUTES.PROFILE_EDIT, element: <EditProfilePage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];

export const appRouter = createBrowserRouter([
  {
    element: <App />,
    children: appRouteObjects,
  },
]);

/** Test helper — must be rendered inside a MemoryRouter / Router. */
export function AppRouter() {
  return useRoutes(appRouteObjects);
}
