# JR-FE-002 - Recommendation frontend scope

The following backend recommendation APIs are intentionally scoped by product surface:

| API                                          | Frontend status                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `POST /job-recommendations/from-text`        | Deferred; PROFILE-primary product decision (JR-PROD-004)                                                |
| `POST /job-recommendations/refresh`          | Service support exists; For You still uses the existing generate action until refresh UX is prioritized |
| `GET /job-recommendations/runs/:runId`       | Service support exists; no run-history/detail screen in the frontend MVP                                |
| `GET /job-recommendations/similar/:jobId`    | Wired for job detail and `/for-you?mode=similar&jobId=...`                                              |
| `GET /job-recommendations/:recommendationId` | List endpoint supplies sufficient card data for For You                                                 |

For You uses PROFILE-only generation via `recommendationsService.generateFromProfile()`.

When additional recommendation modes are prioritized, wire through
`features/recommendations/services/recommendations.service.ts` and add UI on the relevant product
surface - not dashboard mocks.
