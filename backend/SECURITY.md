# Security posture (OWASP Top 10, 2021)

Scope: backend API only (`backend/`). Last reviewed: 2026-08-06, on branch `security-owasp`. This is a living
summary, not an exhaustive audit — update it when a category's mitigations change materially.

## A01 — Broken Access Control

RBAC via `shared/middlewares/rbac.middleware.ts` (`requirePrincipalType`, `requirePermission`), permission catalog
in `shared/rbac/permission.catalog.ts`. Ownership checks return **404, never 403**, on a resource that exists but
isn't the caller's (`assertOwnedResume` in `modules/resumes/services/resume.service.ts` and
`modules/resume-analysis/services/resume-analysis.service.ts`) — this avoids leaking resource existence to a
prober.

**Fixed in this pass:** `resume-analysis` routes had **no auth middleware at all** and its service layer never
checked a `userId` — any caller could read/edit/delete any user's resume analysis by guessing a `resumeId`, and
`GET /saved-versions` returned every user's saved versions with no filter. Now: `authMiddleware` +
`requirePermission` on every route, `assertOwnedResume`/`assertOwnedVersion` guards in the service, and
`listSavedVersions` is scoped to the caller. See `modules/resume-analysis/routes/resume-analysis.route.ts`,
`.../services/resume-analysis.service.ts`.

## A02 — Cryptographic Failures

Passwords: `scrypt` (Node built-in) with a random 16-byte salt per password and a timing-safe compare —
`shared/security/password.util.ts`. JWTs: issuer/audience/algorithm pinned on both sign and verify, secrets
validated at startup (`shared/config/env.conf.ts`) — must be ≥32 chars, non-default, and access/refresh secrets
must differ in production. Cookies: `httpOnly`, `secure` (prod), `sameSite: 'strict'` —
`modules/auth/config/cookies.conf.ts`.

## A03 — Injection

All DB access goes through Prisma with parameterized queries; the only raw SQL in the codebase is the
health-check's `` prisma.$queryRaw`SELECT 1` `` (no interpolation). `hpp()` middleware guards against HTTP
parameter pollution (`securityMiddlewares.ts`).

## A04 — Insecure Design

Account lockout after repeated failures, generic responses on OTP/password-reset endpoints so they don't leak
account existence (`GENERIC_OTP_SENT_MESSAGE` in `modules/auth/constants/auth.constant.ts`), and rate limiting on
sensitive/expensive endpoints (`shared/middlewares/rateLimiter.ts`).

## A05 — Security Misconfiguration

Helmet + CORS (explicit origin allowlist via `CORS_ORIGIN`, `credentials: true`) — `securityMiddlewares.ts`.
`x-powered-by` disabled, `ENABLE_SWAGGER` gates whether API docs are even mounted.

**Fixed in this pass:** CSP was explicitly disabled (`contentSecurityPolicy: false`). Now enabled with a policy
permissive enough for the Swagger UI bundle at `/api-docs` (`'unsafe-inline'` on style/script, `data:` on
img/font) — this only affects rendered HTML, so the JSON API itself is unaffected either way.

## A06 — Vulnerable and Outdated Components

`npm audit` is checked as part of this kind of pass; `package-lock.json` is committed for reproducible installs.

**Fixed in this pass:** `npm audit` found 1 critical (`node-tar`, via `bcrypt`'s install chain) + 4 high
(`nodemailer`, `brace-expansion`). `brace-expansion` fixed via plain `npm audit fix`. `bcrypt` was a declared
dependency that **nothing in the codebase actually imports** (password hashing uses `scrypt`, see A02) — removed
outright, which fully resolves the critical CVE with no breaking-change risk.

**Deferred:** `nodemailer` (actively used in `infrastructure/email/email.service.ts`) has several high-severity
advisories (SMTP/CRLF injection, TLS validation, SSRF via the `raw` message option) fixed only by an `npm audit
fix --force` major-version bump (6.x → 9.x). Deferred to a follow-up where the email-sending call sites can be
verified against the new API surface rather than bundled into an access-control fix. Track via `npm audit`.

## A07 — Identification and Authentication Failures

Account lockout after N failed attempts, OTP with attempt/resend caps, refresh tokens are opaque + DB-backed +
revocable (not JWTs) — reusing an already-rotated refresh token revokes **every** session for that account as a
precaution (`modules/auth/services/token.service.ts`). Auth-relevant events (login success/failure, register,
password change/reset, logout, token reuse) are written to a persistent `AuditLog` — `shared/audit/audit.service.ts`.

## A08 — Software and Data Integrity Failures

`package-lock.json` committed and enforced (no floating installs). No dynamic `eval`/deserialization of
untrusted input found in this pass.

## A09 — Security Logging and Monitoring Failures

Structured logging via `pino` with secrets/tokens redacted from log output (`shared/logger/logger.ts`).
Auth-relevant events go to the persistent `AuditLog` (see A07); operational errors and their request context
(`requestId`, path, method) are logged by the central `errorHandler`.

**Known gap (not fixed in this pass):** authorization failures (403s) are only in ephemeral `pino` logs, not the
persistent `AuditLog` table — there's no queryable trail of repeated permission-denied attempts against one
account. Would need a new `AuditAction` enum value and a migration; left as a follow-up rather than bundled into
this pass to keep the change simple.

## A10 — Server-Side Request Forgery (SSRF)

Checked all outbound HTTP calls in this pass: job-provider clients (`modules/jobs/providers/*`) use fixed,
hardcoded base URLs (not user input); AI clients (`modules/copilot/ai/`, `modules/resume-analysis/ai/`) call
fixed provider endpoints. No feature was found that fetches a URL supplied by a user.

## Known testing-infrastructure gap

The shared Prisma test double (`test-utils/fake-prisma.ts`) doesn't model the `resumeAnalysis`/`resumeVersion`/
`resumeKeyword`/`resumeSuggestion` tables, so the A01 fix above is covered by an auth-gate integration test (401
without a token) plus a narrowly-mocked ownership-guard unit test, rather than a full end-to-end integration test
through the real route stack. Worth closing separately if `resume-analysis` gets broader test coverage.
