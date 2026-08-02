# Recommendation Score Scale (JRE-SCORE-001)

## Contract

Recommendation APIs expose two score scales:

| Field | Scale | Notes |
|---|---|---|
| `displayScore` | 0-100 integer | User-facing match percent; derived from `scoreResult.overallScore` with `Math.round(overallScore * 100)` |
| `scoreResult.overallScore` | 0-1 float | Internal hybrid score; kept for ranking/debugging/backward compatibility |
| Component scores in `scoreResult.components[]` | 0-1 each | Internal unit-interval component scores |
| Categories | Derived from `overallScore` | `>=0.85` BEST_MATCH, `>=0.65` GOOD_MATCH, `>=0.45` STRETCH, else RELATED |

`displayScore` is additive and is not persisted. Database values and scoring
logic remain unit-interval floats in `[0, 1]`.

## Hybrid Overall Score

When vector retrieval supplies a `retrievalScore` in `[0, 1]`:

```text
heuristicScore = sum(componentScore * componentWeight)
overallScore = 0.4 * retrievalScore + 0.6 * heuristicScore
displayScore = Math.round(overallScore * 100)
```

If `retrievalScore` is absent, `overallScore` equals the heuristic-only score.

## Frontend Formatting

Frontend clients should prefer `displayScore` when present and should only
multiply `scoreResult.overallScore` as a backward-compatible fallback:

```ts
const matchPercent = displayScore ?? Math.round(overallScore * 100);
```

Invalid or missing scores should omit the match badge rather than inventing a
percentage.

## Examples

| overallScore | displayScore | UI label |
|---:|---:|---|
| `0` | `0` | `0%` |
| `0.5` | `50` | `50%` |
| `0.874` | `87` | `87%` |
| `0.995` | `100` | `100%` |
