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

export const PERMISSIONS: PermissionDefinition[] = [
  // Auth / sessions
  {
    key: 'auth.session.manage.own',
    resource: 'auth',
    action: 'session.manage.own',
    description: 'Manage own login sessions (refresh / logout / logout-all)',
  },

  // User / profile
  {
    key: 'user.profile.read.own',
    resource: 'user',
    action: 'profile.read.own',
    description: 'Read own profile',
  },
  {
    key: 'user.profile.update.own',
    resource: 'user',
    action: 'profile.update.own',
    description: 'Update own profile',
  },
  {
    key: 'user.profile.read.any',
    resource: 'user',
    action: 'profile.read.any',
    description: 'Read any user profile',
  },
  {
    key: 'user.manage.any',
    resource: 'user',
    action: 'manage.any',
    description: 'List and manage any user account',
  },

  // Resume
  {
    key: 'resume.manage.own',
    resource: 'resume',
    action: 'manage.own',
    description: 'Create, update and delete own resumes',
  },
  {
    key: 'resume-analysis.read.own',
    resource: 'resume-analysis',
    action: 'read.own',
    description: 'View own resume analysis reports',
  },

  // Jobs
  {
    key: 'jobs.read',
    resource: 'jobs',
    action: 'read',
    description: 'Browse and search job listings',
  },
  {
    key: 'jobs.manage',
    resource: 'jobs',
    action: 'manage',
    description: 'Manage job postings and provider sync configuration',
  },

  // Applications
  {
    key: 'applications.manage.own',
    resource: 'applications',
    action: 'manage.own',
    description: 'Create and track own job applications',
  },

  // Interviews
  {
    key: 'interviews.manage.own',
    resource: 'interviews',
    action: 'manage.own',
    description: 'Schedule and manage own interviews',
  },

  // Career
  {
    key: 'career.read.own',
    resource: 'career',
    action: 'read.own',
    description: 'View own career roadmap and insights',
  },

  // Recommendations
  {
    key: 'recommendations.read.own',
    resource: 'recommendations',
    action: 'read.own',
    description: 'View own personalized recommendations',
  },

  // Notifications
  {
    key: 'notifications.manage.own',
    resource: 'notifications',
    action: 'manage.own',
    description: 'Read and manage own notifications',
  },

  // Admin
  {
    key: 'admin.dashboard.view',
    resource: 'admin',
    action: 'dashboard.view',
    description: 'View the admin dashboard and system statistics',
  },
  {
    key: 'admin.roles.manage',
    resource: 'admin',
    action: 'roles.manage',
    description: 'Manage roles and role-permission assignments',
  },
  {
    key: 'admin.system.manage',
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
