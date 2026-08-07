export const ROUTES = {
  APPLICATIONS: '/applications',
  APPLICATION_DETAIL: '/applications/:applicationId',
  HOME: '/',
  DASHBOARD: '/app',
  JOB_FEED: '/jobs-feed',
  JOB_DETAIL: '/jobs/:jobId',
  AI_MATCH: '/ai-match',
  SAVED_JOBS: '/saved-jobs',
  LOGIN: '/login',
  REGISTER: '/register',
  GOOGLE_AUTH_CALLBACK: '/auth/google/callback',
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  CONNECTED_ACCOUNTS: '/settings/connected-accounts',
  UNAUTHORIZED: '/unauthorized',
  RESUME_BUILDER: '/resume-builder',
  SAVED_RESUMES: '/resume-builder/saved',
  AUTO_APPLY: '/auto-apply',
  AI_MAIL: '/ai-mail',
  BROWSER_EXTENSION: '/browser-extension',
  ASSISTED_APPLY_WORKSPACE: '/assisted-apply/:jobApplicationId',
  ASSISTED_APPLICATIONS: '/assisted-applications',
} as const;

export const jobDetailPath = (jobId: string) => `/jobs/${jobId}`;
export const applicationDetailPath = (applicationId: string) => `/applications/${applicationId}`;
export const assistedApplyWorkspacePath = (jobApplicationId: string) =>
  `/assisted-apply/${jobApplicationId}`;
