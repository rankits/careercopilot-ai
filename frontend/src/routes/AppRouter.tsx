/* eslint-disable react-refresh/only-export-components -- router config and component share this module */
import { Suspense, type ReactNode } from 'react';
import { createBrowserRouter, useRoutes, type RouteObject } from 'react-router-dom';

import { RouteErrorBoundary } from '@/routes/components/RouteErrorBoundary';
import { RouteLoading } from '@/routes/components/RouteLoading';

import { App } from '@/app/App';
import { ROUTES } from '@/constants/routes';
import { AppLayout } from '@/layouts/AppLayout';
import {
  GuestRoute,
  LandingRoute,
  OnboardingRoute,
  ProtectedRoute,
} from '@/routes/guards/AuthGuards';
import {
  LazyAiMatchPage,
  LazyApplicationsPage,
  LazyAutoApplyPage,
  LazyEditProfilePage,
  LazyHomePage,
  LazyJobDetailPage,
  LazyJobFeedPage,
  LazyLoginPage,
  LazyNotFoundPage,
  LazyProfilePage,
  LazyRegisterPage,
  LazyResumeBuilderPage,
  LazySavedJobsPage,
  LazySavedResumesPage,
} from '@/routes/lazyPages';

function LazyRoute({ children }: { children: ReactNode }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteLoading />}>{children}</Suspense>
    </RouteErrorBoundary>
  );
}

/** Shared route tree for the data router and for MemoryRouter-based tests. */
export const appRouteObjects: RouteObject[] = [
  { path: ROUTES.HOME, element: <LandingRoute /> },
  {
    element: <GuestRoute />,
    children: [
      {
        path: ROUTES.LOGIN,
        element: (
          <LazyRoute>
            <LazyLoginPage />
          </LazyRoute>
        ),
      },
      {
        path: ROUTES.REGISTER,
        element: (
          <LazyRoute>
            <LazyRegisterPage />
          </LazyRoute>
        ),
      },
    ],
  },
  {
    element: <OnboardingRoute />,
    children: [
      {
        path: ROUTES.PROFILE,
        element: (
          <LazyRoute>
            <LazyProfilePage />
          </LazyRoute>
        ),
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: ROUTES.DASHBOARD,
            element: (
              <LazyRoute>
                <LazyHomePage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.JOB_FEED,
            element: (
              <LazyRoute>
                <LazyJobFeedPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.JOB_DETAIL,
            element: (
              <LazyRoute>
                <LazyJobDetailPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.AI_MATCH,
            element: (
              <LazyRoute>
                <LazyAiMatchPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SAVED_JOBS,
            element: (
              <LazyRoute>
                <LazySavedJobsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.APPLICATIONS,
            element: (
              <LazyRoute>
                <LazyApplicationsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.AUTO_APPLY,
            element: (
              <LazyRoute>
                <LazyAutoApplyPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SAVED_RESUMES,
            element: (
              <LazyRoute>
                <LazySavedResumesPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.RESUME_BUILDER,
            element: (
              <LazyRoute>
                <LazyResumeBuilderPage />
              </LazyRoute>
            ),
          },
          {
            path: `${ROUTES.RESUME_BUILDER}/:resumeId`,
            element: (
              <LazyRoute>
                <LazyResumeBuilderPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.PROFILE_EDIT,
            element: (
              <LazyRoute>
                <LazyEditProfilePage />
              </LazyRoute>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: (
      <LazyRoute>
        <LazyNotFoundPage />
      </LazyRoute>
    ),
  },
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
