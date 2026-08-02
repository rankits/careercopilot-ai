# Saved Search Context Contract

Ticket: `JRE-DATA-004`

## Data Model

- `SavedSearch` is persisted in `saved_searches`.
- `userId` stores the owning user id and is indexed with `id` and `createdAt`.
- `name` is a user-facing label.
- `query` stores optional free-form search text.
- `filters` stores the saved job-search filter snapshot.
- `context` stores optional recommendation context hints derived from the saved search.
- `deletedAt` hides a search from recommendation generation without deleting history.

## Authorization

- `POST /job-recommendations` accepts `sourceType: "SAVED_SEARCH"` with a required `sourceId`.
- `POST /job-recommendations/refresh` accepts the same source body.
- Missing, deleted, and unowned saved searches return `404 RECOMMENDATION_SOURCE_NOT_FOUND`.
- If the loader is not configured, `SAVED_SEARCH` fails closed with `501 JOB_RECOMMENDATIONS_NOT_IMPLEMENTED`.

## Context Mapping

- Saved-search context is built from the owned saved search snapshot.
- `context.targetTitles` and filter titles become `targetTitles`.
- `context.requiredSkills` and filter skills become `requiredSkills`.
- Locations, work mode, employment types, industries, and salary fields map into standard context fields.
- `savedSearchCriteriaVersion` is the saved search `updatedAt` timestamp.
- `savedSearchSnapshot` preserves the search id, criteria version, query, and normalized filters.
- The mapper does not invent titles or skills; `query` and `name` are preserved as source text.

## Verification

- Validation accepts `SAVED_SEARCH` only with a UUID `sourceId`.
- Loader tests cover owned, unowned, and deleted saved searches.
- Authorization tests cover snapshot-to-context mapping and IDOR hiding.
- Generation tests cover a completed in-memory `SAVED_SEARCH` run without 501.
