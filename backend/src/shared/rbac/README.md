# Attribute-Based RBAC

How permission attributes are defined, assigned to roles, enforced on routes,
and tested. This is the shared engine behind every protected route in the
API — read this before adding auth to a new module's routes.

## Mental model

```text
Permission catalog (code)          Role <-> Permission (Postgres)
permission.catalog.ts                    seeded from the catalog
        |                                        |
        |  prisma/seed/permissions.seed.ts        |
        |  prisma/seed/roles.seed.ts               |
        v                                        v
                    RolePermission table
                              |
                              v
              PermissionCache (Redis/memory, 1h TTL)
                              |
                              v
        requirePermission('resource.action.scope')  <- route middleware
                              |
                              v
                  403 if missing, next() if granted
```

Two separate concerns, don't conflate them:

- **`requirePrincipalType('ADMIN' | 'USER')`** - is the caller even the right
  *kind* of principal (Admin table vs User table)? A table-level guard,
  independent of what permissions their role carries.
- **`requirePermission('key')`** - does the caller's specific role carry the
  specific attribute this action needs? The actual authorization decision.

`requireRole('ADMIN' | ...)` also exists (coarse "is role X") but prefer
`requirePermission` for anything that has (or should have) a catalog entry -
see "Don't" below.

## Files

| File | Purpose |
|---|---|
| `permission.catalog.ts` | Single source of truth: every permission `key` that exists, and `ROLE_PERMISSION_MAP` (which roles get which keys). |
| `permission-cache.service.ts` | Cache-first (`PermissionCache.getPermissionsForRole`), Postgres-fallback resolver. Call `invalidateRole` after editing a role's permissions at runtime. |
| `../middlewares/rbac.middleware.ts` | `requirePermission`, `requireRole`, `requirePrincipalType` - the Express guards routes actually import. |
| `prisma/seed/permissions.seed.ts`, `prisma/seed/roles.seed.ts` | Upsert the catalog into `Permission` / `RolePermission` (wholesale replace on `roles.seed.ts`, so re-running the seed after editing the catalog keeps the DB in sync). |

## Adding a new permission attribute

1. Add an entry to `PERMISSIONS` in `permission.catalog.ts`:
   ```ts
   {
     key: 'interviews.manage.own',
     resource: 'interviews',
     action: 'manage.own',
     description: 'Schedule and manage own interviews',
   },
   ```
   Convention: `<resource>.<action>[.own|.any]` - `.own` scopes to resources
   the caller owns, `.any` scopes platform-wide (admin-level).
2. Decide which system role(s) get it. `ROLE_PERMISSION_MAP` is derived
   automatically for the common case (USER gets every non-`admin.*`,
   non-`.any` key; ADMIN gets everything) - you only need to touch it by
   hand for an exception to that rule.
3. Re-run the seed so Postgres matches the catalog:
   ```bash
   npm run prisma:seed
   ```
4. If a role's permissions changed while the app is already running (e.g. an
   admin-facing "edit role" endpoint, once one exists), call
   `PermissionCache.invalidateRole(roleName)` after the write - otherwise
   the old set can serve for up to the 1-hour cache TTL.

## Protecting a route

Compose the guards **inline, per route** - do not build one shared
"requireAdmin"/"requireUser" array and spread it over every route in the
file. That collapses every action in the module to the same coarse check
and defeats the point of attribute-based permissions: a route added later
silently inherits whatever the blob happened to check, instead of declaring
what it actually needs. See `modules/admin/routes/admin.route.ts` for the
pattern this repo follows:

```ts
router.get(
  '/stats',
  authMiddleware,
  requirePrincipalType('ADMIN'),
  requirePermission('admin.dashboard.view'),
  systemStatsController,
);

router.post(
  '/auth/logout-all',
  authMiddleware,
  requirePrincipalType('ADMIN'),
  requirePermission('auth.session.manage.own'),
  logoutAllController,
);
```

Guidelines:

- `authMiddleware` first, always (it populates `req.user`; every RBAC guard
  requires it to have already run).
- `requirePrincipalType(...)` next if the route must only ever be reachable
  by one principal table - cheap, table-level, doesn't vary per action.
- `requirePermission('key')` last, naming the **one** attribute this
  specific action needs. Multiple keys are allowed
  (`requirePermission('a.b', 'c.d')`) if an action genuinely needs more than
  one, but that's the exception, not the default.
- Prefer wiring `requirePermission` even for "own profile" actions when a
  matching `.own` key already exists in the catalog - see `/users/me` GET/PATCH
  (`user.profile.read.own` / `user.profile.update.own`). Only skip it
  entirely when there's genuinely no attribute to check - e.g.
  `GET /admin/auth/me` needs just `authMiddleware` + `requirePrincipalType`,
  because reading your own already-authenticated Admin identity has no
  catalog entry and isn't a permission-gated action in this system's model.
- If the action's permission doesn't have a catalog entry yet, add one (see
  above) rather than reusing an unrelated key or falling back to
  `requireRole`.

## Testing

`src/test-utils/fake-prisma.ts` seeds `FakeDb.roles` from the real
`ROLE_PERMISSION_MAP`, so specs exercise the actual production catalog by
default - a role's permission set in tests is the same one `prisma:seed`
would produce. To assert the *denied* path, strip a role's permissions for
that one test:

```ts
import { fakeDb } from '@/test-utils/app.js';

it('403s when the role lacks the permission', async () => {
  fakeDb.setRolePermissions('ADMIN', []); // or omit just the one key you're testing
  const res = await request(app).get('/api/v1/admin/stats').set(authHeader(token));
  expect(res.status).toBe(403);
});
```

`resetTestState()` (called in `beforeEach` across the suite) restores both
roles to their default `ROLE_PERMISSION_MAP` permissions, so a mutation in
one test can never leak into the next.

## Don't

- Don't build a shared `[authMiddleware, requirePrincipalType(...), requireRole(...)]`
  array and spread it across every route in a module - declare the specific
  permission per route instead (see above).
- Don't check `req.user.role` directly in a controller/service as a stand-in
  for a permission check - it bypasses the catalog and cache entirely, and
  won't get picked up if the role's permissions ever change.
- Don't invent a permission key inline in a route file - add it to
  `PERMISSIONS` first, so it's discoverable and seeded.
- Don't forget to re-run `npm run prisma:seed` after editing the catalog -
  the DB doesn't pick up catalog changes on its own.
