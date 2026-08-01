# JR-FE-002 — Out of scope (Wave 4)

The following backend recommendation APIs are **intentionally not wired in the frontend MVP**:

| API | Reason |
|---|---|
| `POST /job-recommendations/from-text` | PROFILE-primary product decision (JR-PROD-004) |
| `GET /job-recommendations/similar/:jobId` | Deferred; job detail similar-jobs panel not in For You MVP |
| `GET /job-recommendations/:recommendationId` | List endpoint supplies sufficient card data for For You |

For You uses **PROFILE-only** generation via `recommendationsService.generateFromProfile()`.

When similar jobs or from-text search are prioritized, wire through `features/recommendations/services/recommendations.service.ts` and add UI on job detail — not dashboard mocks.
