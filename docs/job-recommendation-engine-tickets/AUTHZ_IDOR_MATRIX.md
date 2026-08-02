# Recommendation Authz And IDOR Matrix

Ticket: `JRE-SEC-001`

All `/api/v1/job-recommendations` routes require Bearer authentication and a
`USER` principal. Controllers derive `userId` from `String(req.user.principalId)`
only; request bodies cannot set recommendation ownership.

| Route | Permission | Ownership / anti-IDOR rule |
|---|---|---|
| `POST /` | `recommendations.create.own` | PROFILE loads the caller's profile; RESUME loads only caller-owned parsed resume data; JOB may use any active catalog job id by product decision |
| `POST /from-text` | `recommendations.create.own` | Text is bound to the authenticated caller's generated run |
| `GET /status` | `recommendations.read.own` | Readiness is computed for the authenticated caller only |
| `GET /` | `recommendations.read.own` | Lists recommendations where persisted `userId` equals caller id |
| `GET /similar/:jobId` | `recommendations.read.own` | Catalog job id is public/intentional; retrieval context and feedback exclusions use caller id |
| `GET /:recommendationId` | `recommendations.read.own` | Lookup includes caller `userId`; missing or cross-user ids return not found |
| `POST /:recommendationId/feedback` | `recommendations.update.own` | Controller first loads the recommendation for caller id; feedback writes verify matching recommendation owner and job id |

## Regression Coverage

- Anonymous requests return `401` for create, from-text, list, detail,
  feedback, similar, and status.
- USER principals missing create/read/update recommendation permissions return
  `403` before route work executes.
- Repository tests prove list, run, detail, feedback read/write, and exclusion
  lookups are scoped by owner id.
- Similar-job service tests prove the public catalog job source still carries
  the authenticated user id into retrieval.

## Intentional Exception

`JOB` source and `similar/:jobId` accept catalog job ids that are not user-owned.
Those endpoints remain authenticated, USER-only, RBAC-protected, and rate-limited
for generation paths. This preserves similar-job discovery without exposing
personalized recommendations or feedback across users.
