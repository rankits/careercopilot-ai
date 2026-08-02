# Recommendation Source Ownership Matrix

Ticket: `JRE-CONTEXT-001`

All recommendation source authorization derives the persisted recommendation
`userId` from the authenticated `USER` principal. Clients cannot provide or
override ownership.

| Source | Current authorization rule | Failure behavior |
|---|---|---|
| `PROFILE` | Load candidate profile by authenticated user id | `404` when absent; `422` when no usable title, skill, or summary signal |
| `RESUME` | Load resume by id, require `resume.userId === authenticated user id`, require latest parse status `COMPLETED` or `NEEDS_REVIEW` | `404` when missing, unowned, or not completed; `422` when completed parse has no usable signal |
| `JOB` | Catalog-global active job id; not user-owned by product decision | `404` when catalog job is absent/inactive |
| `TARGET_TEXT` | Request text is trimmed and bound to authenticated user id; no source id is accepted | `422` when text is blank |
| `CAREER_GOAL` | Not exposed in create schema until the domain model and ownership loader exist | rejected by validation today |
| `SAVED_SEARCH` | Not exposed in create schema until the domain model and ownership loader exist | rejected by validation today |

## No-Run Rule

Source authorization happens before `RecommendationRun` creation. If ownership
or source validation fails, no run or recommendation rows are created.

## Expansion Rule

Future `CAREER_GOAL` and `SAVED_SEARCH` APIs must add owner-scoped loaders before
the source types are reintroduced to the public create schema.
