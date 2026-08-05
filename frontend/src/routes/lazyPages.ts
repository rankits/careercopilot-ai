import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

import { ROUTES } from '@/constants/routes';

type AnyPage = ComponentType<Record<string, never>> | ComponentType<Record<string, unknown>>;
type PageModule<TName extends string> = Record<TName, AnyPage>;

function lazyNamed<TName extends string>(
  loader: () => Promise<PageModule<TName>>,
  exportName: TName,
): LazyExoticComponent<AnyPage> {
  return lazy(() => loader().then((mod) => ({ default: mod[exportName] })));
}

/** Shared page loaders — used by the router and by hover prefetch. */
export const loadLoginPage = () => import('@/pages/LoginPage');
export const loadRegisterPage = () => import('@/pages/RegisterPage');
export const loadProfilePage = () => import('@/pages/ProfilePage');
export const loadHomePage = () => import('@/pages/HomePage');
export const loadJobFeedPage = () => import('@/pages/JobFeedPage');
export const loadJobDetailPage = () => import('@/pages/JobDetailPage');
export const loadAiMatchPage = () => import('@/pages/AiMatchPage');
export const loadSavedJobsPage = () => import('@/pages/SavedJobsPage');
export const loadApplicationsPage = () => import('@/pages/ApplicationsPage');
export const loadApplicationDetailPage = () => import('@/pages/ApplicationDetailPage');
export const loadAutoApplyPage = () => import('@/pages/AutoApplyPage');
export const loadAssistedApplyWorkspacePage = () =>
  import('@/pages/AssistedApplyWorkspacePage/AssistedApplyWorkspacePage');
export const loadSavedResumesPage = () => import('@/pages/SavedResumesPage');
export const loadResumeBuilderPage = () => import('@/pages/ResumeBuilderPage');
export const loadEditProfilePage = () => import('@/pages/EditProfilePage');
export const loadNotFoundPage = () => import('@/pages/NotFoundPage');
export const loadLandingPage = () => import('@/pages/LandingPage');

export const LazyLoginPage = lazyNamed(loadLoginPage, 'LoginPage');
export const LazyRegisterPage = lazyNamed(loadRegisterPage, 'RegisterPage');
export const LazyProfilePage = lazyNamed(loadProfilePage, 'ProfilePage');
export const LazyHomePage = lazyNamed(loadHomePage, 'HomePage');
export const LazyJobFeedPage = lazyNamed(loadJobFeedPage, 'JobFeedPage');
export const LazyJobDetailPage = lazyNamed(loadJobDetailPage, 'JobDetailPage');
export const LazyAiMatchPage = lazyNamed(loadAiMatchPage, 'AiMatchPage');
export const LazySavedJobsPage = lazyNamed(loadSavedJobsPage, 'SavedJobsPage');
export const LazyApplicationsPage = lazyNamed(loadApplicationsPage, 'ApplicationsPage');
export const LazyApplicationDetailPage = lazyNamed(
  loadApplicationDetailPage,
  'ApplicationDetailPage',
);
export const LazyAutoApplyPage = lazyNamed(loadAutoApplyPage, 'AutoApplyPage');
export const LazyAssistedApplyWorkspacePage = lazyNamed(
  loadAssistedApplyWorkspacePage,
  'AssistedApplyWorkspacePage',
);
export const LazySavedResumesPage = lazyNamed(loadSavedResumesPage, 'SavedResumesPage');
export const LazyResumeBuilderPage = lazyNamed(loadResumeBuilderPage, 'ResumeBuilderPage');
export const LazyEditProfilePage = lazyNamed(loadEditProfilePage, 'EditProfilePage');
export const LazyNotFoundPage = lazyNamed(loadNotFoundPage, 'NotFoundPage');
export const LazyLandingPage = lazyNamed(loadLandingPage, 'LandingPage');

const routePrefetchers: Partial<Record<string, () => Promise<unknown>>> = {
  [ROUTES.DASHBOARD]: loadHomePage,
  [ROUTES.JOB_FEED]: loadJobFeedPage,
  [ROUTES.AI_MATCH]: loadAiMatchPage,
  [ROUTES.SAVED_JOBS]: loadSavedJobsPage,
  [ROUTES.APPLICATIONS]: loadApplicationsPage,
  [ROUTES.AUTO_APPLY]: loadAutoApplyPage,
  [ROUTES.RESUME_BUILDER]: loadResumeBuilderPage,
  [ROUTES.SAVED_RESUMES]: loadSavedResumesPage,
  [ROUTES.PROFILE_EDIT]: loadEditProfilePage,
  [ROUTES.PROFILE]: loadProfilePage,
  [ROUTES.LOGIN]: loadLoginPage,
  [ROUTES.REGISTER]: loadRegisterPage,
};

const prefetchedRoutes = new Set<string>();

/** Warm a route chunk on hover/focus so navigation feels instant. */
export function prefetchRoute(href: string | undefined): void {
  if (!href || prefetchedRoutes.has(href)) return;

  const loader = routePrefetchers[href];
  if (!loader) return;

  prefetchedRoutes.add(href);
  void loader().catch(() => {
    prefetchedRoutes.delete(href);
  });
}
