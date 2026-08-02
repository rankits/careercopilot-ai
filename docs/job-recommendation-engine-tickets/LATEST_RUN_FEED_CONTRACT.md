# Latest Run Feed Contract

For You must request `GET /api/v1/job-recommendations?latestOnly=true`.

The backend default mixed-history list remains available for backward
compatibility, but product feed surfaces should opt into latest-run scope so a
user does not see duplicate jobs from historical recommendation runs.

## Rules

- `latestOnly=true` resolves the caller's newest owned `RecommendationRun`.
- Results are paged from that run only, ordered by rank.
- If the caller has no runs, the API returns an empty page.
- `runId=<uuid>` scopes to one explicit owned run.
- `latestOnly=true` and `runId` cannot be combined.

This keeps For You coherent while preserving future history/run-browser use
cases.
