/**
 * Canonical permission catalog for the platform. This is the single source
 * of truth consumed by `prisma/seed/` to populate the `Permission` /
 * `Role` / `RolePermission` tables, and by application code (via string
 * literals matching `key`) when guarding routes with
 * `shared/middlewares/rbac.middleware.ts#requirePermission`.
 *
 * Convention: `key` is `<resource>.<action>[.own|.any]` - `.own` scopes the
 * action to resources the caller owns, `.any` scopes it platform-wide
 * (admin-level). Add new modules' permissions here as they're implemented.
 */
export interface PermissionDefinition {
  key: string;
  resource: string;
  action: string;
  description: string;
}

export const AUTH_PERMISSIONS = {
  READ_SESSION_OWN: 'auth.session.read.own',
  CREATE_SESSION_OWN: 'auth.session.create.own',
  UPDATE_SESSION_OWN: 'auth.session.update.own',
  DELETE_SESSION_OWN: 'auth.session.delete.own',
} as const;

export const USER_PERMISSIONS = {
  READ_PROFILE_OWN: 'user.profile.read.own',
  CREATE_PROFILE_OWN: 'user.profile.create.own',
  UPDATE_PROFILE_OWN: 'user.profile.update.own',
  DELETE_PROFILE_OWN: 'user.profile.delete.own',
  READ_PROFILE_ANY: 'user.profile.read.any',
  CREATE_PROFILE_ANY: 'user.profile.create.any',
  UPDATE_PROFILE_ANY: 'user.profile.update.any',
  DELETE_PROFILE_ANY: 'user.profile.delete.any',
  MANAGE_ANY: 'user.manage.any',
} as const;

export const RESUME_PERMISSIONS = {
  CREATE_OWN: 'resume.create.own',
  READ_OWN: 'resume.read.own',
  UPDATE_OWN: 'resume.update.own',
  DELETE_OWN: 'resume.delete.own',
  READ_ANALYSIS_OWN: 'resume-analysis.read.own',
} as const;

export const JOBS_PERMISSIONS = {
  READ: 'jobs.read',
  CREATE: 'jobs.create',
  UPDATE: 'jobs.update',
  DELETE: 'jobs.delete',
} as const;

export const APPLICATIONS_PERMISSIONS = {
  CREATE_OWN: 'applications.create.own',
  READ_OWN: 'applications.read.own',
  UPDATE_OWN: 'applications.update.own',
  DELETE_OWN: 'applications.delete.own',
} as const;

export const INTERVIEWS_PERMISSIONS = {
  CREATE_OWN: 'interviews.create.own',
  READ_OWN: 'interviews.read.own',
  UPDATE_OWN: 'interviews.update.own',
  DELETE_OWN: 'interviews.delete.own',
} as const;

export const CAREER_PERMISSIONS = {
  READ_OWN: 'career.read.own',
  UPDATE_OWN: 'career.update.own',
} as const;

export const RECOMMENDATIONS_PERMISSIONS = {
  CREATE_OWN: 'recommendations.create.own',
  READ_OWN: 'recommendations.read.own',
  UPDATE_OWN: 'recommendations.update.own',
} as const;

export const NOTIFICATIONS_PERMISSIONS = {
  READ_OWN: 'notifications.read.own',
  UPDATE_OWN: 'notifications.update.own',
  DELETE_OWN: 'notifications.delete.own',
} as const;

export const ADMIN_PERMISSIONS = {
  VIEW_DASHBOARD: 'admin.dashboard.view',
  MANAGE_ROLES: 'admin.roles.manage',
  MANAGE_SYSTEM: 'admin.system.manage',
} as const;

export const PERMISSIONS: PermissionDefinition[] = [
  // Auth / sessions
  {
    key: AUTH_PERMISSIONS.READ_SESSION_OWN,
    resource: 'auth',
    action: 'session.read.own',
    description: 'Read own login session details',
  },
  {
    key: AUTH_PERMISSIONS.CREATE_SESSION_OWN,
    resource: 'auth',
    action: 'session.create.own',
    description: 'Create own login sessions (refresh / login)',
  },
  {
    key: AUTH_PERMISSIONS.UPDATE_SESSION_OWN,
    resource: 'auth',
    action: 'session.update.own',
    description: 'Update own login sessions (refresh / logout)',
  },
  {
    key: AUTH_PERMISSIONS.DELETE_SESSION_OWN,
    resource: 'auth',
    action: 'session.delete.own',
    description: 'Delete own login sessions (logout / revoke)',
  },

  // User / profile
  {
    key: USER_PERMISSIONS.READ_PROFILE_OWN,
    resource: 'user',
    action: 'profile.read.own',
    description: 'Read own profile',
  },
  {
    key: USER_PERMISSIONS.CREATE_PROFILE_OWN,
    resource: 'user',
    action: 'profile.create.own',
    description: 'Create own profile resources',
  },
  {
    key: USER_PERMISSIONS.UPDATE_PROFILE_OWN,
    resource: 'user',
    action: 'profile.update.own',
    description: 'Update own profile',
  },
  {
    key: USER_PERMISSIONS.DELETE_PROFILE_OWN,
    resource: 'user',
    action: 'profile.delete.own',
    description: 'Delete own profile resources',
  },
  {
    key: USER_PERMISSIONS.READ_PROFILE_ANY,
    resource: 'user',
    action: 'profile.read.any',
    description: 'Read any user profile',
  },
  {
    key: USER_PERMISSIONS.CREATE_PROFILE_ANY,
    resource: 'user',
    action: 'profile.create.any',
    description: 'Create any user profile resources',
  },
  {
    key: USER_PERMISSIONS.UPDATE_PROFILE_ANY,
    resource: 'user',
    action: 'profile.update.any',
    description: 'Update any user profile',
  },
  {
    key: USER_PERMISSIONS.DELETE_PROFILE_ANY,
    resource: 'user',
    action: 'profile.delete.any',
    description: 'Delete any user profile resources',
  },
  {
    key: USER_PERMISSIONS.MANAGE_ANY,
    resource: 'user',
    action: 'manage.any',
    description: 'List and manage any user account',
  },

  // Resume
  {
    key: RESUME_PERMISSIONS.CREATE_OWN,
    resource: 'resume',
    action: 'create.own',
    description: 'Create own resumes',
  },
  {
    key: RESUME_PERMISSIONS.READ_OWN,
    resource: 'resume',
    action: 'read.own',
    description: 'Read own resumes',
  },
  {
    key: RESUME_PERMISSIONS.UPDATE_OWN,
    resource: 'resume',
    action: 'update.own',
    description: 'Update own resumes',
  },
  {
    key: RESUME_PERMISSIONS.DELETE_OWN,
    resource: 'resume',
    action: 'delete.own',
    description: 'Delete own resumes',
  },
  {
    key: RESUME_PERMISSIONS.READ_ANALYSIS_OWN,
    resource: 'resume-analysis',
    action: 'read.own',
    description: 'View own resume analysis reports',
  },

  // Jobs
  {
    key: JOBS_PERMISSIONS.READ,
    resource: 'jobs',
    action: 'read',
    description: 'Browse and search job listings',
  },
  {
    key: JOBS_PERMISSIONS.CREATE,
    resource: 'jobs',
    action: 'create',
    description: 'Create job postings and provider sync configuration',
  },
  {
    key: JOBS_PERMISSIONS.UPDATE,
    resource: 'jobs',
    action: 'update',
    description: 'Update job postings and provider sync configuration',
  },
  {
    key: JOBS_PERMISSIONS.DELETE,
    resource: 'jobs',
    action: 'delete',
    description: 'Delete job postings and provider sync configuration',
  },

  // Applications
  {
    key: APPLICATIONS_PERMISSIONS.CREATE_OWN,
    resource: 'applications',
    action: 'create.own',
    description: 'Create own job applications',
  },
  {
    key: APPLICATIONS_PERMISSIONS.READ_OWN,
    resource: 'applications',
    action: 'read.own',
    description: 'Read own job applications',
  },
  {
    key: APPLICATIONS_PERMISSIONS.UPDATE_OWN,
    resource: 'applications',
    action: 'update.own',
    description: 'Update own job applications',
  },
  {
    key: APPLICATIONS_PERMISSIONS.DELETE_OWN,
    resource: 'applications',
    action: 'delete.own',
    description: 'Delete own job applications',
  },

  // Interviews
  {
    key: INTERVIEWS_PERMISSIONS.CREATE_OWN,
    resource: 'interviews',
    action: 'create.own',
    description: 'Create own interviews',
  },
  {
    key: INTERVIEWS_PERMISSIONS.READ_OWN,
    resource: 'interviews',
    action: 'read.own',
    description: 'Read own interviews',
  },
  {
    key: INTERVIEWS_PERMISSIONS.UPDATE_OWN,
    resource: 'interviews',
    action: 'update.own',
    description: 'Update own interviews',
  },
  {
    key: INTERVIEWS_PERMISSIONS.DELETE_OWN,
    resource: 'interviews',
    action: 'delete.own',
    description: 'Delete own interviews',
  },

  // Career
  {
    key: CAREER_PERMISSIONS.READ_OWN,
    resource: 'career',
    action: 'read.own',
    description: 'View own career roadmap and insights',
  },
  {
    key: CAREER_PERMISSIONS.UPDATE_OWN,
    resource: 'career',
    action: 'update.own',
    description: 'Update own career roadmap and insights',
  },

  // Recommendations
  {
    key: RECOMMENDATIONS_PERMISSIONS.CREATE_OWN,
    resource: 'recommendations',
    action: 'create.own',
    description: 'Create own job recommendation runs',
  },
  {
    key: RECOMMENDATIONS_PERMISSIONS.READ_OWN,
    resource: 'recommendations',
    action: 'read.own',
    description: 'View own personalized recommendations',
  },
  {
    key: RECOMMENDATIONS_PERMISSIONS.UPDATE_OWN,
    resource: 'recommendations',
    action: 'update.own',
    description: 'Update own job recommendation feedback and saved searches',
  },

  // Notifications
  {
    key: NOTIFICATIONS_PERMISSIONS.READ_OWN,
    resource: 'notifications',
    action: 'read.own',
    description: 'Read own notifications',
  },
  {
    key: NOTIFICATIONS_PERMISSIONS.UPDATE_OWN,
    resource: 'notifications',
    action: 'update.own',
    description: 'Update own notifications',
  },
  {
    key: NOTIFICATIONS_PERMISSIONS.DELETE_OWN,
    resource: 'notifications',
    action: 'delete.own',
    description: 'Delete own notifications',
  },

  // Admin
  {
    key: ADMIN_PERMISSIONS.VIEW_DASHBOARD,
    resource: 'admin',
    action: 'dashboard.view',
    description: 'View the admin dashboard and system statistics',
  },
  {
    key: ADMIN_PERMISSIONS.MANAGE_ROLES,
    resource: 'admin',
    action: 'roles.manage',
    description: 'Manage roles and role-permission assignments',
  },
  {
    key: ADMIN_PERMISSIONS.MANAGE_SYSTEM,
    resource: 'admin',
    action: 'system.manage',
    description: 'Manage system-level configuration',
  },
];

export const SYSTEM_ROLES = ['ADMIN', 'USER'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

/**
 * USER gets every self-service ("own"/unscoped) permission across all
 * modules; ADMIN inherits everything, including the "any"/admin.* ones.
 */
export const ROLE_PERMISSION_MAP: Record<SystemRole, string[]> = {
  USER: PERMISSIONS.filter((p) => !p.key.startsWith('admin.') && !p.key.endsWith('.any')).map(
    (p) => p.key,
  ),
  ADMIN: PERMISSIONS.map((p) => p.key),
};
