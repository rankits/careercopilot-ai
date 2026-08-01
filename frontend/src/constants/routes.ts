export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/app',
  JOB_FEED: '/jobs-feed',
  JOB_DETAIL: '/jobs/:jobId',
  SAVED_JOBS: '/saved-jobs',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  UNAUTHORIZED: '/unauthorized',
} as const;

export const jobDetailPath = (jobId: string) => `/jobs/${jobId}`;
