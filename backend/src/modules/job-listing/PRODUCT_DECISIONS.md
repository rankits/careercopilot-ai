# Job listing product decisions

Recorded **2026-08-01** to unblock Wave 3–4 implementation.

## JOB-PROD-001 — Recommended jobs listing UX

**Decision: Option A — separate For-you experience**

| Choice | Detail |
|---|---|
| Main `/jobs` feed | Remains non-personalized; no match % on `JobListDto` |
| Personalized UX | Consume existing authenticated `/api/v1/job-recommendations` (list / detail) |
| Generate | Do **not** call recommendation generate on every listing page load; generate stays an explicit action |
| Rejected | B (enrich GET `/jobs`) — couples listing latency to scoring; C alone — too weak for a listing surface |

**Owner:** Engineering (interim product proxy)  
**Unblocks:** `JOB-REC-001`, `JOB-REC-002`, `JOB-REC-003`

## JOB-PROD-002 — Save job and apply UX

**Decision: Application `SAVED` + external apply**

| Choice | Detail |
|---|---|
| Save model | Reuse `Application` with `currentStatus = SAVED` via authenticated applications APIs |
| Save API shape | Dedicated idempotent save/unsave helpers on applications (`POST/DELETE …/saved-jobs`) wrapping create/delete |
| New `SavedJob` table | **Not** in this phase |
| Apply | External `applyUrl` only (already `JOB-FE-006`); no auto status transition to APPLIED required for MVP |
| Auth | Always `req.user.principalId` (`JOB-SEC-001`) |

**Owner:** Engineering (interim product proxy)  
**Unblocks:** `JOB-BE-004`, `JOB-FE-005` (sidebar Saved Jobs restored after FE-005)
