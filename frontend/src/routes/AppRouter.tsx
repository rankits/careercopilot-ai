/* eslint-disable react-refresh/only-export-components -- router config and component share this module */
import {
  Navigate,
  createBrowserRouter,
  useLocation,
  useRoutes,
  type RouteObject,
} from 'react-router-dom';

import { App } from '@/app/App';
import { ROUTES } from '@/constants/routes';
import { AppLayout } from '@/layouts/AppLayout';
import { AiMailPage } from '@/pages/AiMailPage';
import { AiMatchPage } from '@/pages/AiMatchPage';
import { ApplicationsPage } from '@/pages/ApplicationsPage';
import { AssistedApplicationsPage } from '@/pages/AssistedApplicationsPage';
import { AssistedApplyWorkspacePage } from '@/pages/AssistedApplyWorkspacePage/AssistedApplyWorkspacePage';
import { AutoApplyPage } from '@/pages/AutoApplyPage';
import { BrowserExtensionPage } from '@/pages/BrowserExtensionPage';
import { EditProfilePage } from '@/pages/EditProfilePage';
import { GoogleAuthCallbackPage } from '@/pages/GoogleAuthCallbackPage';
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
import { ConnectedAccountsPage } from '@/pages/Settings/ConnectedAccountsPage';
import { OAuthResultPage } from '@/pages/Settings/OAuthResultPage';
import {
  GuestRoute,
  OnboardingRoute,
  ProtectedRoute,
  RootRedirect,
} from '@/routes/guards/AuthGuards';

function LegacyForYouRedirect() {
  const location = useLocation();
  return <Navigate replace to={`${ROUTES.AI_MATCH}${location.search}${location.hash}`} />;
}

/** Shared route tree for the data router and for MemoryRouter-based tests. */
export const appRouteObjects: RouteObject[] = [
  { path: ROUTES.HOME, element: <RootRedirect /> },
  { path: ROUTES.GOOGLE_AUTH_CALLBACK, element: <GoogleAuthCallbackPage /> },
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
          { path: ROUTES.AI_MATCH, element: <AiMatchPage /> },
          { path: '/for-you', element: <LegacyForYouRedirect /> },
          { path: ROUTES.SAVED_JOBS, element: <SavedJobsPage /> },
          { path: ROUTES.APPLICATIONS, element: <ApplicationsPage /> },
          { path: ROUTES.ASSISTED_APPLICATIONS, element: <AssistedApplicationsPage /> },
          { path: ROUTES.AUTO_APPLY, element: <AutoApplyPage /> },
          { path: ROUTES.AI_MAIL, element: <AiMailPage /> },
          { path: ROUTES.BROWSER_EXTENSION, element: <BrowserExtensionPage /> },
          { path: ROUTES.ASSISTED_APPLY_WORKSPACE, element: <AssistedApplyWorkspacePage /> },
          { path: ROUTES.SAVED_RESUMES, element: <SavedResumesPage /> },
          { path: ROUTES.RESUME_BUILDER, element: <ResumeBuilderPage /> },
          { path: `${ROUTES.RESUME_BUILDER}/:resumeId`, element: <ResumeBuilderPage /> },
          { path: ROUTES.PROFILE_EDIT, element: <EditProfilePage /> },
          { path: ROUTES.CONNECTED_ACCOUNTS, element: <ConnectedAccountsPage /> },
          { path: `${ROUTES.CONNECTED_ACCOUNTS}/google/result`, element: <OAuthResultPage /> },
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
