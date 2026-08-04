import { describe, expect, it } from 'vitest';

import {
  ADMIN_PERMISSIONS,
  AUTH_PERMISSIONS,
  AUTO_APPLY_PERMISSIONS,
  CAREER_PERMISSIONS,
  JOBS_PERMISSIONS,
  NOTIFICATIONS_PERMISSIONS,
  PERMISSIONS,
  RECOMMENDATIONS_PERMISSIONS,
  RESUME_PERMISSIONS,
  ROLE_PERMISSION_MAP,
  USER_PERMISSIONS,
} from '@/shared/rbac/permission.catalog.js';

describe('permission catalog constants', () => {
  it('exposes module-scoped permission constants for each permission key', () => {
    expect(AUTH_PERMISSIONS.READ_SESSION_OWN).toBe('auth.session.read.own');
    expect(AUTH_PERMISSIONS.CREATE_SESSION_OWN).toBe('auth.session.create.own');
    expect(AUTH_PERMISSIONS.UPDATE_SESSION_OWN).toBe('auth.session.update.own');
    expect(AUTH_PERMISSIONS.DELETE_SESSION_OWN).toBe('auth.session.delete.own');
    expect(USER_PERMISSIONS.READ_PROFILE_OWN).toBe('user.profile.read.own');
    expect(USER_PERMISSIONS.CREATE_PROFILE_OWN).toBe('user.profile.create.own');
    expect(USER_PERMISSIONS.UPDATE_PROFILE_OWN).toBe('user.profile.update.own');
    expect(USER_PERMISSIONS.DELETE_PROFILE_OWN).toBe('user.profile.delete.own');
    expect(USER_PERMISSIONS.READ_PROFILE_ANY).toBe('user.profile.read.any');
    expect(USER_PERMISSIONS.MANAGE_ANY).toBe('user.manage.any');
    expect(RESUME_PERMISSIONS.CREATE_OWN).toBe('resume.create.own');
    expect(RESUME_PERMISSIONS.READ_OWN).toBe('resume.read.own');
    expect(RESUME_PERMISSIONS.UPDATE_OWN).toBe('resume.update.own');
    expect(RESUME_PERMISSIONS.DELETE_OWN).toBe('resume.delete.own');
    expect(RESUME_PERMISSIONS.READ_ANALYSIS_OWN).toBe('resume-analysis.read.own');
    expect(JOBS_PERMISSIONS.READ).toBe('jobs.read');
    expect(JOBS_PERMISSIONS.CREATE).toBe('jobs.create');
    expect(JOBS_PERMISSIONS.UPDATE).toBe('jobs.update');
    expect(JOBS_PERMISSIONS.DELETE).toBe('jobs.delete');
    expect(CAREER_PERMISSIONS.READ_OWN).toBe('career.read.own');
    expect(CAREER_PERMISSIONS.UPDATE_OWN).toBe('career.update.own');
    expect(RECOMMENDATIONS_PERMISSIONS.CREATE_OWN).toBe('recommendations.create.own');
    expect(RECOMMENDATIONS_PERMISSIONS.READ_OWN).toBe('recommendations.read.own');
    expect(RECOMMENDATIONS_PERMISSIONS.UPDATE_OWN).toBe('recommendations.update.own');
    expect(NOTIFICATIONS_PERMISSIONS.READ_OWN).toBe('notifications.read.own');
    expect(NOTIFICATIONS_PERMISSIONS.UPDATE_OWN).toBe('notifications.update.own');
    expect(NOTIFICATIONS_PERMISSIONS.DELETE_OWN).toBe('notifications.delete.own');
    expect(ADMIN_PERMISSIONS.VIEW_DASHBOARD).toBe('admin.dashboard.view');
    expect(ADMIN_PERMISSIONS.MANAGE_ROLES).toBe('admin.roles.manage');
    expect(ADMIN_PERMISSIONS.MANAGE_SYSTEM).toBe('admin.system.manage');
    expect(AUTO_APPLY_PERMISSIONS.PROFILE_READ_OWN).toBe('applications.autoapply.profile.read.own');
    expect(AUTO_APPLY_PERMISSIONS.PROFILE_UPDATE_OWN).toBe(
      'applications.autoapply.profile.update.own',
    );
    expect(AUTO_APPLY_PERMISSIONS.ANSWERS_CREATE_OWN).toBe(
      'applications.autoapply.answers.create.own',
    );
    expect(AUTO_APPLY_PERMISSIONS.ANSWERS_READ_OWN).toBe('applications.autoapply.answers.read.own');
    expect(AUTO_APPLY_PERMISSIONS.ANSWERS_UPDATE_OWN).toBe(
      'applications.autoapply.answers.update.own',
    );
    expect(AUTO_APPLY_PERMISSIONS.ANSWERS_DELETE_OWN).toBe(
      'applications.autoapply.answers.delete.own',
    );
    expect(AUTO_APPLY_PERMISSIONS.RESUME_VERSIONS_CREATE_OWN).toBe(
      'applications.autoapply.resume-versions.create.own',
    );
    expect(AUTO_APPLY_PERMISSIONS.RESUME_VERSIONS_READ_OWN).toBe(
      'applications.autoapply.resume-versions.read.own',
    );
    expect(AUTO_APPLY_PERMISSIONS.RESUME_VERSIONS_UPDATE_OWN).toBe(
      'applications.autoapply.resume-versions.update.own',
    );
    expect(AUTO_APPLY_PERMISSIONS.RESUME_VERSIONS_DELETE_OWN).toBe(
      'applications.autoapply.resume-versions.delete.own',
    );
    expect(AUTO_APPLY_PERMISSIONS.RULES_READ_OWN).toBe('applications.autoapply.rules.read.own');
    expect(AUTO_APPLY_PERMISSIONS.RULES_UPDATE_OWN).toBe('applications.autoapply.rules.update.own');
    expect(AUTO_APPLY_PERMISSIONS.ELIGIBILITY_READ_OWN).toBe(
      'applications.autoapply.eligibility.read.own',
    );
    expect(AUTO_APPLY_PERMISSIONS.CHANNEL_READ_OWN).toBe('applications.autoapply.channel.read.own');
    expect(AUTO_APPLY_PERMISSIONS.VACANCY_EMAIL_READ_OWN).toBe(
      'applications.autoapply.vacancy-email.read.own',
    );
    expect(AUTO_APPLY_PERMISSIONS.EVENTS_READ_OWN).toBe('applications.autoapply.events.read.own');
    expect(AUTO_APPLY_PERMISSIONS.DIAGNOSTICS_READ_ANY).toBe(
      'applications.autoapply.diagnostics.read.any',
    );
    expect(AUTO_APPLY_PERMISSIONS.PLAN_CREATE_OWN).toBe('applications.autoapply.plan.create.own');
    expect(AUTO_APPLY_PERMISSIONS.PLAN_READ_OWN).toBe('applications.autoapply.plan.read.own');
    expect(AUTO_APPLY_PERMISSIONS.CONSENT_CREATE_OWN).toBe(
      'applications.autoapply.consent.create.own',
    );
    expect(AUTO_APPLY_PERMISSIONS.CONSENT_READ_OWN).toBe('applications.autoapply.consent.read.own');
    expect(AUTO_APPLY_PERMISSIONS.CONSENT_DELETE_OWN).toBe(
      'applications.autoapply.consent.delete.own',
    );
    expect(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_CREATE_OWN).toBe(
      'applications.autoapply.submissions.create.own',
    );
    expect(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_READ_OWN).toBe(
      'applications.autoapply.submissions.read.own',
    );
    expect(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_UPDATE_OWN).toBe(
      'applications.autoapply.submissions.update.own',
    );
    expect(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_DELETE_OWN).toBe(
      'applications.autoapply.submissions.delete.own',
    );
  });

  it('uses the shared constants in the role permission map', () => {
    expect(ROLE_PERMISSION_MAP.USER).toContain(USER_PERMISSIONS.READ_PROFILE_OWN);
    expect(ROLE_PERMISSION_MAP.ADMIN).toContain(ADMIN_PERMISSIONS.MANAGE_SYSTEM);
    expect(
      PERMISSIONS.some((permission) => permission.key === AUTH_PERMISSIONS.READ_SESSION_OWN),
    ).toBe(true);
  });

  it('applies the critical admin and user RBAC edge cases', () => {
    expect(ROLE_PERMISSION_MAP.USER).toContain(JOBS_PERMISSIONS.READ);
    expect(ROLE_PERMISSION_MAP.USER).toContain(NOTIFICATIONS_PERMISSIONS.READ_OWN);
    expect(ROLE_PERMISSION_MAP.USER).not.toContain(ADMIN_PERMISSIONS.VIEW_DASHBOARD);
    expect(ROLE_PERMISSION_MAP.USER).not.toContain(ADMIN_PERMISSIONS.MANAGE_SYSTEM);
    expect(ROLE_PERMISSION_MAP.USER).not.toContain(USER_PERMISSIONS.MANAGE_ANY);
    expect(ROLE_PERMISSION_MAP.USER).not.toContain(USER_PERMISSIONS.READ_PROFILE_ANY);

    expect(ROLE_PERMISSION_MAP.ADMIN).toContain(ADMIN_PERMISSIONS.VIEW_DASHBOARD);
    expect(ROLE_PERMISSION_MAP.ADMIN).toContain(ADMIN_PERMISSIONS.MANAGE_SYSTEM);
    expect(ROLE_PERMISSION_MAP.ADMIN).toContain(USER_PERMISSIONS.MANAGE_ANY);
    expect(ROLE_PERMISSION_MAP.ADMIN).toContain(USER_PERMISSIONS.READ_PROFILE_ANY);
  });

  it('seeds one permission catalog entry per module group and one record per permission definition', () => {
    const moduleCount = new Set(PERMISSIONS.map((permission) => permission.resource)).size;
    // 11 pre-existing resource groups + 12 auto-apply sub-resources (profile,
    // answers, resume-versions, rules, eligibility, channel, plan, consent,
    // submissions, vacancy-email, events, diagnostics).
    expect(moduleCount).toBe(23);
    expect(PERMISSIONS).toHaveLength(67);
  });

  it('grants USER every auto-apply "own" permission but none would-be "any" permission', () => {
    expect(ROLE_PERMISSION_MAP.USER).toContain(AUTO_APPLY_PERMISSIONS.PROFILE_READ_OWN);
    expect(ROLE_PERMISSION_MAP.USER).toContain(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_CREATE_OWN);
    expect(ROLE_PERMISSION_MAP.USER).toContain(AUTO_APPLY_PERMISSIONS.CHANNEL_READ_OWN);
    expect(ROLE_PERMISSION_MAP.USER).toContain(AUTO_APPLY_PERMISSIONS.PLAN_CREATE_OWN);
    expect(ROLE_PERMISSION_MAP.USER).not.toContain(AUTO_APPLY_PERMISSIONS.DIAGNOSTICS_READ_ANY);
    expect(ROLE_PERMISSION_MAP.ADMIN).toContain(AUTO_APPLY_PERMISSIONS.DIAGNOSTICS_READ_ANY);
    expect(ROLE_PERMISSION_MAP.ADMIN).toContain(AUTO_APPLY_PERMISSIONS.PROFILE_READ_OWN);
  });
});
