import { ROUTES } from '@/constants/routes';

/** Map the current pathname to the sidebar/bottom-nav active item id. */
export function resolveSidebarActiveItemId(pathname: string): string {
  if (pathname === ROUTES.PROFILE_EDIT || pathname.startsWith(`${ROUTES.PROFILE}/`)) {
    return 'settings';
  }
  if (pathname === ROUTES.SAVED_JOBS) {
    return 'saved-jobs';
  }
  if (pathname === ROUTES.AI_MATCH) {
    return 'ai-match';
  }
  if (pathname === ROUTES.APPLICATIONS || pathname.startsWith(`${ROUTES.APPLICATIONS}/`)) {
    return 'applications';
  }
  if (pathname === ROUTES.AUTO_APPLY) {
    return 'auto-apply';
  }
  if (pathname.startsWith('/assisted-apply/')) {
    return 'applications';
  }
  if (pathname === ROUTES.JOB_FEED || pathname.startsWith('/jobs/')) {
    return 'jobs-feed';
  }
  if (pathname === ROUTES.SAVED_RESUMES || pathname.startsWith(`${ROUTES.SAVED_RESUMES}/`)) {
    return 'saved-resumes';
  }
  if (pathname.startsWith(ROUTES.RESUME_BUILDER)) {
    return 'resume-builder';
  }
  return 'dashboard';
}
