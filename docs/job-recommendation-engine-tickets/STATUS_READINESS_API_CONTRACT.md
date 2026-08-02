# Recommendation Status Readiness API Contract

Ticket: `JRE-API-001`

## Endpoint

`GET /api/v1/job-recommendations/status`

- Authentication: bearer token
- Principal: `USER`
- Permission: `recommendations.read.own`
- Request body/query: none

## Response

The success envelope returns `data` with:

- `ready`
- `lifecycleState`
- `canGenerateFromProfile`
- `blockers`
- `stale`
- `lastGeneratedAt`
- `retrieval.backend`
- `retrieval.configured`
- `retrieval.embeddingCoverageRatio`

`lifecycleState` is one of:

- `NOT_STARTED`
- `QUEUED`
- `PROCESSING`
- `READY`
- `STALE`
- `FAILED`
- `FAILED_TIMEOUT`
- `FAILED_PROVIDER`
- `FAILED_EMPTY`

Known blockers are:

- `PROFILE_INCOMPLETE`
- `PROFILE_NOT_FOUND`
- `PROFILE_UNAVAILABLE`
- `RECOMMENDATIONS_STALE`
- `EMBEDDING_COVERAGE_LOW`

## Client Contract

Frontend recommendation types mirror the lifecycle, blocker, and retrieval
backend enums. The frontend service validates readiness payloads before
returning them to UI code.

## Swagger

Swagger documents the route as authenticated and marks the core readiness fields
as required in the success schema.

## Verification

- Backend API tests cover authenticated readiness response shape.
- Backend Swagger tests cover security and lifecycle schema presence.
- Frontend service tests cover readiness unwrap and invalid lifecycle rejection.
- Backend and frontend typechecks pass.
