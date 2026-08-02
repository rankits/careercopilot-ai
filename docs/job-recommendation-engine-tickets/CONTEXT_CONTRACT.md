# Recommendation Context Contract

Version: `1.1.0`

This contract freezes the normalized context shape used by every recommendation
source. Source authorization may load different domain objects, but retrieval,
filtering, scoring, ranking, and explanation stages consume one
`RecommendationContext`.

## Runtime Source Of Truth

- TypeScript: `backend/src/modules/recommendations/types/recommendations.types.ts`
- Version constant: `RECOMMENDATION_CONTEXT_SCHEMA_VERSION`
- Normalizer: `normalizeExtractedRecommendationContext`

## Source Population Rules

| Source | Required population | Optional population |
|---|---|---|
| `PROFILE` | `targetTitles`, `requiredSkills` when available | seniority, locations, education, certifications, source text, preferences |
| `RESUME` | parsed titles, skills, experience when available | resume education, certifications, locations, source text |
| `JOB` | job title, skills, location, employment type, salary, description text | industry |
| `TARGET_TEXT` | raw `sourceText` | extracted titles, skills, work authorization, filter mode, goal intent |
| `CAREER_GOAL` | target role/title intent | current role, transition summary, career level, transferable skills, work authorization |
| `SAVED_SEARCH` | saved-search criteria snapshot | query text, salary, location, industry, work-mode filters |

## Defaults

Array fields default to `[]`, object fields such as `salaryExpectation` default to
an empty object, and source-specific fields default to `undefined`. PROFILE
generation must remain valid when no full-engine fields are present.
`filterMode` defaults to `STRICT` when omitted.

`contextSchemaVersion` is stamped onto built contexts at normalization time.
Downstream consumers should treat missing source-specific fields as absent
signals, not as hard failures.

## Compatibility Notes

This ticket adds only optional fields and runtime defaults. It does not widen
source authorization, add CAREER_GOAL/SAVED_SEARCH persistence, or change the
PROFILE generate/list API response shape.
