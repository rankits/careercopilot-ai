# Recommendation score scale (JOB-REC-001)

## Contract

All recommendation scores exposed by `/api/v1/job-recommendations` are **unit-interval floats in `[0, 1]`**.

| Field | Scale | Notes |
|---|---|---|
| `scoreResult.overallScore` | 0–1 | Primary UI match value; hybrid of retrieval + heuristic (see below) |
| Component scores in `scoreResult.components[]` | 0–1 each | Same unit interval |
| Categories | Derived from overall | ≥0.85 BEST_MATCH, ≥0.65 GOOD_MATCH, ≥0.45 STRETCH, else RELATED |

Scores are clamped on write (`clampScore`). They are **not** 0–100 integers.

## Hybrid overall score (JR-PROD-001)

When vector retrieval supplies a `retrievalScore` in `[0, 1]`:

```
heuristicScore = Σ (componentScore × componentWeight)   // nine components, weights sum to 1
overallScore   = 0.4 × retrievalScore + 0.6 × heuristicScore
```

If `retrievalScore` is absent, `overallScore` equals `heuristicScore` only.

## FE formatting

```ts
// Display percent for UI only — never persist 0–100.
const matchPercent = Math.round(overallScore * 100); // e.g. 0.87 → 87
```

Invalid / missing scores: omit the badge (do not invent a percentage).

## Examples

| overallScore | UI label |
|---|---|
| `0` | `0%` |
| `0.5` | `50%` |
| `0.874` | `87%` |
| `1` | `100%` |
