# Recommendation Lifecycle Status Contract

Ticket: `JRE-ARCH-002`

`GET /api/v1/job-recommendations/status` keeps the existing readiness fields and
adds `lifecycleState`.

## Lifecycle States

| lifecycleState | Derived from |
|---|---|
| `NOT_STARTED` | No recommendation run exists for the user |
| `QUEUED` | Latest run status is `PENDING` |
| `PROCESSING` | Latest run status is `RETRIEVING` or `SCORING` |
| `READY` | Latest run status is `COMPLETED` and freshness checks pass |
| `STALE` | Latest run status is `COMPLETED` and profile/resume freshness checks say regenerate |
| `FAILED_TIMEOUT` | Latest run failed with `RECOMMENDATION_GENERATION_TIMEOUT` |
| `FAILED_PROVIDER` | Latest run failed because the embedding provider was unavailable |
| `FAILED_EMPTY` | Latest run failed because no eligible jobs were found |
| `FAILED` | Latest run failed for any other reason |

## Backward Compatibility

- `ready` remains a boolean for existing frontend flows.
- `canGenerateFromProfile`, `blockers`, `stale`, `lastGeneratedAt`, and
  `retrieval` are unchanged.
- `QUEUED` is reserved for future async generation; synchronous generation may
  only surface it briefly if a status request races a new run.
