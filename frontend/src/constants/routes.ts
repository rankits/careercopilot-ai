export const ROUTES = {
  APPLICATIONS: '/applications',
  HOME: '/',
  DASHBOARD: '/app',
  JOB_FEED: '/jobs-feed',
  JOB_DETAIL: '/jobs/:jobId',
  FOR_YOU: '/for-you',
  SAVED_JOBS: '/saved-jobs',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  UNAUTHORIZED: '/unauthorized',
  RESUME_BUILDER: '/resume-builder',
  SAVED_RESUMES: '/resume-builder/saved',
} as const;

export const jobDetailPath = (jobId: string) => `/jobs/${jobId}`;
