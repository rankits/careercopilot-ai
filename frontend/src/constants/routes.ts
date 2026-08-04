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
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  UNAUTHORIZED: '/unauthorized',
  RESUME_BUILDER: '/resume-builder',
  SAVED_RESUMES: '/resume-builder/saved',
  AUTO_APPLY: '/auto-apply',
} as const;

export const jobDetailPath = (jobId: string) => `/jobs/${jobId}`;
export const applicationDetailPath = (applicationId: string) => `/applications/${applicationId}`;
