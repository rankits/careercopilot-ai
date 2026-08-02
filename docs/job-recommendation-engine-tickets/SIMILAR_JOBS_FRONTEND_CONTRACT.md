# Similar Jobs Frontend Contract

Ticket: `JRE-FE-003`

## API Client

- `recommendationsService.getSimilarJobs(jobId, { limit })` calls
  `GET /job-recommendations/similar/:jobId`.
- The service unwraps the standard success envelope and returns the similar-job array.
- Callers pass `AbortSignal` through React Query.

## UI Entry Points

- Job detail pages expose a `Find similar` action.
- The detail page fetches only after the user clicks `Find similar`.
- The For You Similar tab reads the source job from `/for-you?mode=similar&jobId=<jobId>`.
- If the Similar tab has no `jobId`, it renders an empty source-selection state and does not fetch.

## Card Mapping

- Similar-job cards reuse the same `displayScore` mapping path as Profile recommendations.
- Source jobs are filtered client-side as a defensive guard even though the backend self-excludes.
- Similar cards can open their job detail page and launch validated apply URLs.

## States

- Loading, empty, error, and retry states are rendered independently from Profile recommendations.
- The Similar tab does not call the Profile recommendation list endpoint.
