/* eslint-disable react-refresh/only-export-components -- router config and component share this module */
import { Suspense, type ReactNode } from 'react';
import { createBrowserRouter, useRoutes, type RouteObject } from 'react-router-dom';

import { RouteErrorBoundary } from '@/routes/components/RouteErrorBoundary';
import { RouteLoading } from '@/routes/components/RouteLoading';

import { App } from '@/app/App';
import { ROUTES } from '@/constants/routes';
import { AppLayout } from '@/layouts/AppLayout';
import { GoogleAuthCallbackPage } from '@/pages/GoogleAuthCallbackPage';
import { AiMailPage } from '@/pages/AiMailPage';
import { ConnectedAccountsPage } from '@/pages/Settings/ConnectedAccountsPage';
import { OAuthResultPage } from '@/pages/Settings/OAuthResultPage';
import {
  GuestRoute,
  LandingRoute,
  OnboardingRoute,
  ProtectedRoute,
} from '@/routes/guards/AuthGuards';
import {
  LazyAiMatchPage,
  LazyApplicationDetailPage,
  LazyApplicationsPage,
  LazyAssistedApplicationsPage,
  LazyAssistedApplyWorkspacePage,
  LazyAutoApplyPage,
  LazyBrowserExtensionPage,
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
  { path: ROUTES.GOOGLE_AUTH_CALLBACK, element: <GoogleAuthCallbackPage /> },
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
            path: ROUTES.APPLICATION_DETAIL,
            element: (
              <LazyRoute>
                <LazyApplicationDetailPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ASSISTED_APPLICATIONS,
            element: (
              <LazyRoute>
                <LazyAssistedApplicationsPage />
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
            path: ROUTES.AI_MAIL,
            element: <AiMailPage />,
          },
          {
            path: ROUTES.BROWSER_EXTENSION,
            element: (
              <LazyRoute>
                <LazyBrowserExtensionPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ASSISTED_APPLY_WORKSPACE,
            element: (
              <LazyRoute>
                <LazyAssistedApplyWorkspacePage />
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
          {
            path: ROUTES.CONNECTED_ACCOUNTS,
            element: <ConnectedAccountsPage />,
          },
          {
            path: `${ROUTES.CONNECTED_ACCOUNTS}/google/result`,
            element: <OAuthResultPage />,
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
