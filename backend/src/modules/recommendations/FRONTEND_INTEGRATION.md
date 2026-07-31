# Frontend: Job Recommendations Integration

Backend recommendation APIs are live on `feat/recommendation-engine` under
`/api/v1/job-recommendations`. This doc lists everything the frontend still needs
to do to consume them (no FE implementation yet).

Swagger: `/api-docs` → tag **Job Recommendations**.

---

## Prerequisites

1. Apply backend migration `20260801003000_add_job_recommendations` (`npm run prisma:migrate` / `prisma:deploy`).
2. Ensure job embeddings exist for catalog jobs (`AI_EMBEDDING_*` env + embedding worker/backfill), or generate/similar will return 404 `NO_ELIGIBLE_JOBS_FOUND`.
3. User must be authenticated as a **USER** principal with:
   - `recommendations.create.own`
   - `recommendations.read.own`
   - `recommendations.update.own`  
     (already on the default USER role catalog; FE does not enforce RBAC today).

---

## API surface (paths relative to `VITE_API_BASE_URL`, which already includes `/api/v1`)

| Method | Path                                              | Permission | Purpose                                    |
| ------ | ------------------------------------------------- | ---------- | ------------------------------------------ |
| `POST` | `/job-recommendations`                            | create.own | Generate from PROFILE / RESUME / JOB       |
| `POST` | `/job-recommendations/from-text`                  | create.own | Generate from free-text target             |
| `GET`  | `/job-recommendations`                            | read.own   | List persisted recommendations (paginated) |
| `GET`  | `/job-recommendations/:recommendationId`          | read.own   | Recommendation detail                      |
| `POST` | `/job-recommendations/:recommendationId/feedback` | update.own | Upsert feedback                            |
| `GET`  | `/job-recommendations/similar/:jobId`             | read.own   | Similar scored jobs (not persisted)        |

### Response envelope

Backend returns:

```json
{ "status": "success", "message": "...", "data": ... }
```

Errors:

```json
{ "status": "error", "message": "...", "code": "..." }
```

Note: `frontend/src/interfaces/api.ts` currently models `{ success: boolean, data, message }`.
Normalize in the recommendations service the same way resume/auth services unwrap nested
`response.data.data`, and treat `status === 'success'` as OK.

---

## Suggested feature module layout

Follow auth/resume feature slicing:

```text
frontend/src/features/recommendations/
  types/recommendations.types.ts
  services/recommendations.service.ts
  mappers/toJobCardData.ts
  hooks/
    useGenerateRecommendations.ts
    useRecommendationsList.ts
    useRecommendationDetail.ts
    useRecommendationFeedback.ts
    useSimilarJobs.ts
  components/   (optional feature-specific UI)
```

Wire pages via React Query (`queryClient` in `src/services/queryClient.ts`) and keep
pages behind existing `ProtectedRoute` (`src/routes/guards/AuthGuards.tsx`).

---

## Types to add (mirror backend DTOs)

### Shared filters (create / from-text)

```ts
type RecommendationFilters = {
  locations?: string[];
  workModes?: string[]; // first value → remote preference
  employmentTypes?: string[];
  minimumSalary?: number;
  maximumSalary?: number;
  currency?: string; // ISO 4217, length 3
  industries?: string[];
  experienceLevels?: string[];
  includeStretchOpportunities?: boolean; // false → only BEST_MATCH / GOOD_MATCH
};
```

### Generate requests

```ts
// POST /job-recommendations
type CreateRecommendationBody = {
  sourceType: 'PROFILE' | 'RESUME' | 'JOB' | 'CAREER_GOAL' | 'SAVED_SEARCH';
  sourceId?: string; // required for RESUME/JOB; forbidden for PROFILE
  filters?: RecommendationFilters;
};

// POST /job-recommendations/from-text
type CreateFromTextBody = {
  targetText: string; // 1..20000 chars
  filters?: RecommendationFilters;
};
```

**Do not call CAREER_GOAL / SAVED_SEARCH yet** — backend returns 501 until those domains exist.

### Recommendation item (generate + list + detail)

```ts
type RecommendationJob = {
  id: string;
  title: string;
  company: { slug: string; name: string; logoUrl: string | null; verified: boolean };
  location: { formatted: string; remoteType: string | null };
  employmentType: string | null;
  salary: { minimum: number | null; maximum: number | null; currency: string | null };
  skills: string[];
  publishedAt: string | null;
  expiresAt: string | null;
};

type RecommendationItem = {
  id: string;
  runId: string;
  rank: number;
  job: RecommendationJob;
  scoreResult: {
    overallScore: number; // 0..1
    components: Record<
      | 'requiredSkills'
      | 'title'
      | 'experience'
      | 'responsibilities'
      | 'preferredSkills'
      | 'location'
      | 'industry'
      | 'salary'
      | 'qualifications',
      number
    >;
    matchedSkills: string[];
    relatedSkills: string[];
    missingSkills: string[];
    reasons: Array<{ component: string; message: string; evidence: string[] }>;
  };
  category: 'BEST_MATCH' | 'GOOD_MATCH' | 'STRETCH_OPPORTUNITY' | 'RELATED_CAREER_PATH';
  matchType: 'EXACT' | 'ALIAS' | 'RELATED' | 'TRANSFERABLE' | 'MISSING';
  createdAt: string; // ISO
};
```

### List page

```ts
type RecommendationPage = {
  items: RecommendationItem[];
  page: number;
  limit: number;
  total: number;
};
```

### Similar jobs (no `id` / `runId` / `createdAt`)

```ts
type SimilarJobItem = {
  rank: number;
  job: RecommendationJob;
  scoreResult: RecommendationItem['scoreResult'];
  category: RecommendationItem['category'];
  matchType: RecommendationItem['matchType'];
};
```

### Feedback

```ts
type FeedbackAction =
  | 'VIEWED' | 'OPENED' | 'SAVED' | 'APPLIED'
  | 'DISMISSED' | 'NOT_RELEVANT' | 'MORE_LIKE_THIS' | 'LESS_LIKE_THIS';

// POST body
{ action: FeedbackAction; note?: string }

// response data
{ id: string; recommendationId: string; action: FeedbackAction; note: string | null; createdAt: string }
```

---

## Service methods to implement

`features/recommendations/services/recommendations.service.ts` using `httpClient`:

1. `generateFromSource(body)` → `POST /job-recommendations` → `RecommendationItem[]`
2. `generateFromText(body)` → `POST /job-recommendations/from-text` → `RecommendationItem[]`
3. `list({ page, limit })` → `GET /job-recommendations` → `RecommendationPage`
4. `getById(recommendationId)` → `GET /job-recommendations/:id` → `RecommendationItem`
5. `submitFeedback(recommendationId, body)` → `POST .../feedback`
6. `listSimilar(jobId, limit?)` → `GET /job-recommendations/similar/:jobId` → `SimilarJobItem[]`

Error handling: surface `message` + optional `code` from backend (e.g. `NO_ELIGIBLE_JOBS_FOUND`,
`RECOMMENDATION_CONTEXT_INVALID`, `SOURCE_NOT_FOUND`, `JOB_RECOMMENDATIONS_NOT_IMPLEMENTED`).

---

## UI work checklist

### 1. Replace dashboard fake data

| Current stub            | File                           | Replace with                                  |
| ----------------------- | ------------------------------ | --------------------------------------------- |
| `recommendedJobs`       | `constants/pages/dashboard.ts` | `list()` or generate-then-list                |
| `bestJobMatch`          | same                           | top `BEST_MATCH` / rank 1 item                |
| Home “Recommended Jobs” | `pages/HomePage/HomePage.tsx`  | React Query hook + loading/empty/error states |

Mapper: `RecommendationItem` → `JobCardData` (`components/molecules/JobCard`):

| `JobCardData`                 | Source                                                                      |
| ----------------------------- | --------------------------------------------------------------------------- |
| `company`                     | `job.company.name`                                                          |
| `logo`                        | `job.company.logoUrl ?? fallback`                                           |
| `location`                    | `job.location.formatted`                                                    |
| `salary`                      | format min/max/currency                                                     |
| `match`                       | `Math.round(scoreResult.overallScore * 100)`                                |
| `postedAt`                    | `job.publishedAt` (relative time)                                           |
| `skills` / title fields       | `job.skills`, `job.title`                                                   |
| `isRecommended`               | `true` for this surface                                                     |
| `experience` / bands / accent | derive heuristically or use placeholders until job detail enrichments exist |

`DashboardJobRow` / `JobCard` can stay; only the data source changes.

### 2. Generate flows (product decisions)

Pick and wire at least one primary source:

| Source      | When to call                       | FE needs                                                           |
| ----------- | ---------------------------------- | ------------------------------------------------------------------ |
| `PROFILE`   | User completed candidate profile   | Ensure profile exists (`/resumes/profiles/:userId`); no `sourceId` |
| `RESUME`    | User selects a parsed resume       | Resume id with completed parse; pass `sourceId`                    |
| `JOB`       | “More like this” from a job        | Job UUID                                                           |
| `from-text` | Search / “Describe your next role” | Textarea + optional filters UI                                     |

Recommended MVP:

1. On dashboard mount (or explicit “Refresh recommendations”):  
   `POST /job-recommendations` with `{ sourceType: 'PROFILE' }` if profile complete, else `from-text` / prompt user.
2. Persist is server-side — subsequent visits use `GET /job-recommendations`.
3. Show empty state when list is empty and generate returns 404 `NO_ELIGIBLE_JOBS_FOUND`.

### 3. Detail / explanation UI

- Route optional: e.g. `/app/recommendations/:recommendationId` or a drawer on Home/Job feed.
- Show `category`, `matchType`, `scoreResult.overallScore`, component breakdown, `reasons`, matched/missing skills.
- CTA: open job detail / apply (job listing routes as they exist today).

### 4. Feedback actions

Map UI affordances to `FeedbackAction`:

| UI                    | Action                                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| Save / bookmark       | `SAVED`                                                                |
| Apply clicked         | `APPLIED`                                                              |
| Dismiss / hide        | `DISMISSED`                                                            |
| Not relevant          | `NOT_RELEVANT`                                                         |
| More like this        | `MORE_LIKE_THIS` (optionally also call similar or regenerate from JOB) |
| Less like this        | `LESS_LIKE_THIS`                                                       |
| Card visible / opened | `VIEWED` / `OPENED` (optional analytics-style)                         |

Call `POST /job-recommendations/:id/feedback`. Invalidate list/detail queries after success.

### 5. Similar jobs

- On job detail (when a catalog `jobId` exists): `GET /job-recommendations/similar/:jobId?limit=10`.
- Render as a “Similar roles” section; items are **not** persisted recommendation rows (no feedback id unless you also generate from JOB).

### 6. Job feed “AI Recommended” filter

`constants/pages/jobFeed.ts` + `isRecommended` / `'ai'` filter currently use fake jobs.
Options:

- Filter feed client-side against ids from `list()`, or
- Keep feed separate and only mark cards whose `job.id` appears in recommendation list.

### 7. Filters UI (optional MVP+)

Expose a subset of `RecommendationFilters` on generate/from-text:

- work mode, employment type, salary min/max, stretch toggle
- Pass through on generate; do not invent FE-only filters the API ignores

### 8. Routing / navigation

| Task                                      | Notes                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| Keep under `ProtectedRoute` + `AppLayout` | Same as Home / job feed                                                        |
| Optional new `ROUTES` entry               | e.g. recommendations hub / detail                                              |
| “View all” on Home                        | Today → `ROUTES.JOB_FEED`; either keep or point to a recommendations list page |

### 9. Loading / empty / error UX

| State                                 | Behavior                                             |
| ------------------------------------- | ---------------------------------------------------- |
| List loading                          | Skeleton on Home recommendation block                |
| Empty list, no generate yet           | CTA to generate from profile/text                    |
| Generate 404 no jobs                  | Explain embeddings/catalog may be empty              |
| Generate 422 empty profile            | Send user to complete profile / parse resume         |
| Generate 501 CAREER_GOAL/SAVED_SEARCH | Hide those source options                            |
| 401                                   | Existing unauthorized handler                        |
| 403                                   | Show generic forbidden (FE has no permission matrix) |

### 10. Tests

- Unit: mapper `RecommendationItem` → `JobCardData`
- Service tests with mocked `httpClient` (mirror resume/auth)
- Hook tests for success/error query states
- Optional page test: Home renders list from mocked query

---

## Out of scope for FE until backend domains exist

- CAREER_GOAL / SAVED_SEARCH generate sources
- Candidate embedding management UI
- Admin recommendation analytics
- Async “run status” polling (generation is synchronous today; 200 returns full results)

---

## Implementation order (suggested)

1. Types + `recommendations.service.ts` + response unwrap helper
2. Mapper → `JobCardData`
3. `useRecommendationsList` + replace HomePage stubs
4. Generate-from-PROFILE (or from-text) + refresh button
5. Feedback on save/dismiss
6. Detail/reasons drawer
7. Similar jobs on job detail
8. Job feed AI filter wiring
9. Filters UI polish

---

## Quick reference: important backend codes

| Code                                  | HTTP | Meaning                                  |
| ------------------------------------- | ---- | ---------------------------------------- |
| `NO_ELIGIBLE_JOBS_FOUND`              | 404  | Retrieval/scoring produced no candidates |
| `RECOMMENDATION_CONTEXT_INVALID`      | 422  | Empty profile/resume signal or bad limit |
| `SOURCE_NOT_FOUND`                    | 404  | Missing job/profile/owned resume         |
| `RECOMMENDATION_NOT_FOUND`            | 404  | Bad id or not owned                      |
| `JOB_RECOMMENDATIONS_NOT_IMPLEMENTED` | 501  | Unsupported source                       |
| `EMBEDDING_PROVIDER_UNAVAILABLE`      | 503  | Embedding provider failure               |
