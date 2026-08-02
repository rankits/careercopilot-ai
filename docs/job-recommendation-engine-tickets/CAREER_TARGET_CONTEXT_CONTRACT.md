# Career Target Context Contract

Ticket: `JRE-DATA-003`

## Data Model

- `CareerTarget` is persisted in `career_targets`.
- `userId` stores the owning user id and is indexed with `id` and `createdAt`.
- `goalText` stores the user-entered career direction as text.
- `structured` stores optional extracted target fields as JSON.
- `archivedAt` hides a target from recommendation generation without deleting it.

## Authorization

- `POST /job-recommendations` accepts `sourceType: "CAREER_GOAL"` with a required `sourceId`.
- `POST /job-recommendations/refresh` accepts the same source body.
- Missing, archived, and unowned career targets return `404 RECOMMENDATION_SOURCE_NOT_FOUND`.
- If the loader is not configured, `CAREER_GOAL` fails closed with `501 JOB_RECOMMENDATIONS_NOT_IMPLEMENTED`.

## Context Mapping

- Career-goal context combines the owned career target with the user's current profile when present.
- Target role/title fields from `structured` become primary `targetTitles`.
- Target skills are prepended to current profile skills in `requiredSkills`.
- Current profile titles become `relatedTitles` so the transition direction is retained.
- `goalIntent`, `targetRole`, `careerTransitionSummary`, and `flexibilityMode` are populated from the target when available.
- The mapper does not invent titles or skills; `goalText` is preserved as source text.

## Verification

- Validation accepts `CAREER_GOAL` only with a UUID `sourceId`.
- Loader tests cover owned, unowned, and archived career targets.
- Authorization tests cover profile-plus-target context merging and IDOR hiding.
- Generation tests cover a completed in-memory `CAREER_GOAL` run without 501.
