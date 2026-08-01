# Product decisions — Job Recommendation production

Recorded decisions for Wave 1 production tickets. Implementation tickets reference these choices.

## JR-PROD-001 — Score semantics (hybrid ranking)

**Decision:** Option A — Fuse `retrievalScore` into `overallScore` (hybrid). Keep the 0–1 unit interval.

**Formula:**

```
heuristicScore = weighted sum of nine heuristic components (weights sum to 1)
overallScore   = 0.4 * retrievalScore + 0.6 * heuristicScore
```

When `retrievalScore` is missing (non-vector path), treat it as `0` and document that behavior.

**Rationale:** Vector retrieval selects the candidate pool; heuristic scoring explains fit. Both signals should influence the displayed match percent.

**Implementation:** JR-RANK-001, `docs/SCORE_SCALE.md`.

---

## JR-PROD-002 — Sync vs async generation

**Decision:** Option A — Keep synchronous generate on the HTTP request path. Add timeouts and rate limits. Remove dead recommendation/job-sync worker stubs (or make them no-op removed from boot). Prefer clean removal of unused stubs.

**Rationale:** MVP already ships sync generation; async workers are empty stubs that confuse ops. Rate limits and timeouts address cost/DoS before investing in a queue.

**Implementation:** JR-SEC-001, JR-SEC-003; delete `recommendation.queue.ts` / `recommendation.worker.ts` stubs when safe.

---
