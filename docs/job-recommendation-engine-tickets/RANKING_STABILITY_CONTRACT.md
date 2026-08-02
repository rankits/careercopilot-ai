# Ranking Stability Contract

Recommendation ordering is deterministic for persisted recommendations and
similar-job responses.

## Comparator

1. `scoreResult.overallScore` descending
2. `matchType` quality:
   - `EXACT`
   - `ALIAS`
   - `RELATED`
   - `TRANSFERABLE`
   - `MISSING`
3. `job.id` ascending

The same comparator is used before assigning persisted `rank` and before
returning similar-job results.

## Pagination

For You uses `latestOnly=true`, which pages a single latest run ordered by
persisted `rank`. This prevents duplicate historical-run jobs from appearing
across feed pages while preserving the mixed-history list for future history UI.
