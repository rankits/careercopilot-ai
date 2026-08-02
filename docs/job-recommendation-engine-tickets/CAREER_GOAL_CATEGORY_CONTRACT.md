# Career Goal Category Contract

Ticket: `JRE-BE-002`

## Scope

`CAREER_GOAL` recommendations use the existing recommendation category enum with
path-aware semantics. The category extension is applied after hybrid retrieval
and heuristic score fusion, so persisted `overallScore` remains comparable with
other recommendation sources.

## Category Semantics

- `BEST_MATCH`: the job title aligns with the target role/title and required
  skill evidence is strong.
- `GOOD_MATCH`: the job is a bridge or transitional role, either via related
  titles from the goal context or skill evidence that supports the transition.
- `STRETCH_OPPORTUNITY`: the job aligns with the target role but has severe
  required-skill gaps, or it is a weaker bridge role.
- `RELATED_CAREER_PATH`: the job aligns with the current role or is otherwise a
  lower-confidence adjacent path result.

The classifier deliberately avoids creating new enum values so existing API and
frontend contracts remain backward compatible.

## Explanations

Each `CAREER_GOAL` scored item receives an additional `title` reason:

```text
Career goal path classification: <path kind>
```

Evidence includes the final category, path kind, target role/title, current
role when present, job title, and final hybrid score.

## Observability

The recommendation metrics snapshot exposes `careerCategoryDistribution`, a
count of final categories assigned during career-goal scoring:

```json
{
  "careerCategoryDistribution": {
    "BEST_MATCH": 0,
    "GOOD_MATCH": 0,
    "STRETCH_OPPORTUNITY": 0,
    "RELATED_CAREER_PATH": 0
  }
}
```

Flexible-filter category caps are applied after career-goal classification, so
the distribution records the final user-visible category.
