# 17 - Implementation Progress

Progress log for Job Recommendation Engine tickets on branch `feat/job-recommendation-engine`.

**First Ready ticket:** `JRE-ARCH-001` - Freeze unified recommendation context contract.

---

## Summary

| Metric | Value |
|---|---|
| Tickets total | 61 |
| Implemented | 4 |
| Verified | 0 |
| In Progress | 0 |
| Last updated | 2026-08-02 |

---

## Progress log

### 2026-08-02 - JRE-FILTER-001 - Ensure closed expired inactive jobs excluded on retrieve and list

- Status: Implemented
- Implemented files:
  - `backend/src/modules/recommendations/repositories/prisma-recommendation.unit-of-work.ts`
  - `backend/src/modules/recommendations/__tests__/pgvector-candidate-retrieval.test.ts`
  - `backend/src/modules/job-listing/repositories/__tests__/prisma-job-search.repository.test.ts`
  - `docs/job-recommendation-engine-tickets/ELIGIBILITY_FILTER_CONTRACT.md`
- API changes: default recommendation lists now count/page only eligible active recommendations
- Database changes: none
- Tests added:
  - Retrieval drops vector hits that are not hydrated by the active-only job repository
  - Job repository `findByIds` asserts ACTIVE-only hydration
- Commands executed:
  - `npm --prefix backend run test -- recommendations/__tests__/pgvector-candidate-retrieval.test.ts recommendations/__tests__/recommendation-generation.test.ts recommendations/__tests__/recommendations.api.test.ts modules/job-listing/repositories/__tests__/prisma-job-search.repository.test.ts`
  - `npm exec -- eslint ... --max-warnings=0`
  - `npm --prefix backend run typecheck`
- Results:
  - Focused retrieval/list tests passed
  - Touched-file lint passed
  - Backend typecheck still fails only in `src/workers/job-embedding.worker.ts`
- Known limitations: lifecycle invalidation when jobs close remains out of scope for `JRE-LIFE-002`
- Next ticket: `JRE-ARCH-002`

### 2026-08-02 - JRE-SCORE-001 - Expose displayScore 0-100 while keeping internal scores 0-1

- Status: Implemented
- Implemented files:
  - `backend/src/modules/recommendations/mappers/recommendation.mapper.ts`
  - `backend/src/modules/recommendations/swagger/recommendations.swagger.ts`
  - `frontend/src/features/jobs/utils/formatRecommendationScore.ts`
  - `frontend/src/features/recommendations/types/recommendation.types.ts`
  - `frontend/src/features/recommendations/hooks/useRecommendations.ts`
  - `docs/SCORE_SCALE.md`
- API changes: additive `displayScore` on recommendation and similar-job response items
- Database changes: none
- Tests added:
  - Backend displayScore mapper contract test
  - Frontend formatter tests for displayScore preference and unit-score fallback
  - For You page regression proving displayScore is not double-scaled
- Commands executed:
  - `npm --prefix backend run test -- recommendations/__tests__/recommendation.mapper.test.ts recommendations/__tests__/recommendation-generation.test.ts recommendations/__tests__/recommendations.api.test.ts recommendations/__tests__/similar-jobs.service.test.ts`
  - `npm --prefix frontend run test -- src/features/jobs/utils/formatRecommendationScore.test.ts src/features/recommendations/services/recommendations.service.test.ts`
  - `npm --prefix frontend run test -- src/pages/ForYouPage/ForYouPage.test.tsx`
  - `npm --prefix frontend run typecheck`
  - `npm exec -- eslint ... --max-warnings=0`
  - `npm --prefix backend run typecheck`
- Results:
  - Focused backend and frontend tests passed
  - Frontend typecheck passed
  - Touched-file lint passed
  - Backend typecheck still fails only in `src/workers/job-embedding.worker.ts`
- Known limitations: missing-component scoring policy remains out of scope for `JRE-SCORE-002`
- Next ticket: `JRE-FILTER-001`

### 2026-08-02 - JRE-SEC-001 - Verify and harden recommendation authz and IDOR regression suite

- Status: Implemented
- Implemented files:
  - `backend/src/modules/recommendations/__tests__/recommendations.api.test.ts`
  - `backend/src/modules/recommendations/__tests__/recommendation-idor.test.ts`
  - `backend/src/modules/recommendations/__tests__/similar-jobs.service.test.ts`
  - `backend/src/modules/recommendations/services/recommendation-source-authorization.service.ts`
  - `backend/src/modules/recommendations/index.ts`
  - `backend/src/modules/recommendations/repositories/prisma-recommendation.unit-of-work.ts`
  - `docs/job-recommendation-engine-tickets/AUTHZ_IDOR_MATRIX.md`
- API changes: none; auth/RBAC behavior preserved and regression-covered
- Database changes: none
- Tests added:
  - Anonymous matrix for create, from-text, list, detail, feedback, similar, and status
  - RBAC denial coverage for create/read/update permissions
  - Repository IDOR coverage for list, run lookup, detail lookup, feedback writes, feedback reads, and exclusion lookup
  - Similar-job user-context assertion
- Commands executed:
  - `npm --prefix backend run test -- recommendations/__tests__/recommendations.api.test.ts recommendations/__tests__/recommendation-idor.test.ts recommendations/__tests__/similar-jobs.service.test.ts recommendations/__tests__/recommendation-core.test.ts recommendations/__tests__/recommendation-generation.test.ts`
  - `npm exec -- eslint ... --max-warnings=0`
  - `npm --prefix backend run typecheck`
- Results:
  - Focused security tests passed
  - Touched-file lint passed
  - Backend typecheck still fails only in `src/workers/job-embedding.worker.ts`
- Known limitations: prompt-injection hardening and account deletion cleanup remain out of scope
- Next ticket: `JRE-SCORE-001`

### 2026-08-02 - JRE-ARCH-001 - Freeze unified recommendation context contract

- Status: Implemented
- Implemented files:
  - `backend/src/modules/recommendations/types/recommendations.types.ts`
  - `backend/src/modules/recommendations/strategies/recommendation-source.strategy.ts`
  - `backend/src/modules/recommendations/mappers/recommendation.mapper.ts`
  - `docs/job-recommendation-engine-tickets/CONTEXT_CONTRACT.md`
- API changes: none; PROFILE generate/list response shape unchanged
- Database changes: none
- Tests added:
  - Full-engine optional context fields in source strategy tests
  - Schema-version assertions for PROFILE, RESUME, JOB, CAREER_GOAL, and SAVED_SEARCH context builders
- Commands executed:
  - `npm --prefix backend run test -- recommendations/__tests__/recommendation-strategies.test.ts recommendations/__tests__/candidate-profile-source.mapper.test.ts recommendations/__tests__/candidate-job-filters.test.ts recommendations/__tests__/pgvector-candidate-retrieval.test.ts recommendations/__tests__/recommendation-scoring.service.test.ts`
  - `npm exec -- eslint ... --max-warnings=0`
  - `npm --prefix backend run typecheck`
- Results:
  - Focused tests passed
  - Touched-file lint passed
  - Backend typecheck still fails on pre-existing recommendation feedback, Prisma import, authorization narrowing, recommendation ID typing, and job-embedding worker issues
- Known limitations: no CAREER_GOAL/SAVED_SEARCH persistence or TARGET_TEXT extraction implemented in this ticket
- Next ticket: `JRE-SEC-001`

<!--
Template for each entry:

### YYYY-MM-DD - JRE-XXX-### - <title>

- Status: In Progress | Implemented | Verified
- Implemented files:
- API changes:
- Database changes:
- Tests added:
- Commands executed:
- Results:
- Known limitations:
- Next ticket:
-->
