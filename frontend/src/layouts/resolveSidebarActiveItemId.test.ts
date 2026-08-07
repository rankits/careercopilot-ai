import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/constants/routes';

import { resolveSidebarActiveItemId } from './resolveSidebarActiveItemId';

describe('resolveSidebarActiveItemId', () => {
  it.each([
    [ROUTES.DASHBOARD, 'dashboard'],
    [ROUTES.JOB_FEED, 'jobs-feed'],
    ['/jobs/job-123', 'jobs-feed'],
    [ROUTES.AI_MATCH, 'ai-match'],
    [ROUTES.SAVED_JOBS, 'saved-jobs'],
    [ROUTES.APPLICATIONS, 'applications'],
    [ROUTES.AUTO_APPLY, 'auto-apply'],
    [ROUTES.ASSISTED_APPLICATIONS, 'assisted-applications'],
    ['/assisted-apply/job-app-1', 'assisted-applications'],
    [ROUTES.BROWSER_EXTENSION, 'browser-extension'],
    [ROUTES.RESUME_BUILDER, 'resume-builder'],
    [`${ROUTES.RESUME_BUILDER}/resume-1`, 'resume-builder'],
    [ROUTES.SAVED_RESUMES, 'saved-resumes'],
    [ROUTES.PROFILE_EDIT, 'settings'],
    [`${ROUTES.PROFILE}/extra`, 'settings'],
  ])('maps %s → %s', (pathname, expected) => {
    expect(resolveSidebarActiveItemId(pathname)).toBe(expected);
  });
});
