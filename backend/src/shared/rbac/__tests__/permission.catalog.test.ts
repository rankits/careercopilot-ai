import { describe, expect, it } from 'vitest';

import {
  ADMIN_PERMISSIONS,
  AUTH_PERMISSIONS,
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
    expect(RECOMMENDATIONS_PERMISSIONS.READ_OWN).toBe('recommendations.read.own');
    expect(NOTIFICATIONS_PERMISSIONS.READ_OWN).toBe('notifications.read.own');
    expect(NOTIFICATIONS_PERMISSIONS.UPDATE_OWN).toBe('notifications.update.own');
    expect(NOTIFICATIONS_PERMISSIONS.DELETE_OWN).toBe('notifications.delete.own');
    expect(ADMIN_PERMISSIONS.VIEW_DASHBOARD).toBe('admin.dashboard.view');
    expect(ADMIN_PERMISSIONS.MANAGE_ROLES).toBe('admin.roles.manage');
    expect(ADMIN_PERMISSIONS.MANAGE_SYSTEM).toBe('admin.system.manage');
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
    expect(moduleCount).toBe(10);
    expect(PERMISSIONS).toHaveLength(31);
  });
});
