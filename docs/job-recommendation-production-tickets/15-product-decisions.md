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

## JR-PROD-003 — Feedback and exclusion policy

**Decision:** Negative feedback excludes jobs from future retrieval; applied jobs exclude; saved jobs do **not** exclude.

| Action | Effect on future retrieval |
|---|---|
| DISMISSED, NOT_RELEVANT, LESS_LIKE_THIS | Exclude job |
| APPLIED | Exclude job |
| SAVED | Keep eligible (no exclude) |
| VIEWED, OPENED, MORE_LIKE_THIS | No exclusion |

Persist exclusions via `RecommendationFeedback` (and application tracker for applied).

**Implementation:** JR-RET-001 (Wave 3); document now for retrieval work.

---

## JR-PROD-004 — Profile vs resume precedence

**Decision:** Option A — **PROFILE primary**. Frontend stays on PROFILE generate; resume remains a separate explicit source type when product adds UI.

**Rationale:** Profile is the confirmed user-edited signal; resume parse is an alternate source, not a silent override.

**Implementation:** JR-DATA-001 (Wave 2); FE already uses PROFILE only on For You.

---

## JR-PROD-005 — CAREER_GOAL / SAVED_SEARCH API surface

**Decision:** Option A — Remove `CAREER_GOAL` and `SAVED_SEARCH` from public API request schema and Swagger until domain models exist. Keep enums in DB schema if needed; reject at API boundary with clear 400 (via Zod) rather than silent 501.

**Implementation:** JR-API-001.

---
