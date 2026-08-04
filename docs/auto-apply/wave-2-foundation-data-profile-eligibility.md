# Wave 2 — Foundation: Data Model, Profile, Answer Library, Eligibility

See [00-overview-and-decisions.md](00-overview-and-decisions.md) for repo conventions and locked decisions. Requires Wave 1 complete (dead module removed, enums honest — don't build new models next to still-conflicting old ones).

> **Implementation status: done**, built additive-only (this wave never needed existing files touched — Wave 1's cleanup items did, and were handled separately). New module `backend/src/modules/auto-apply/` + `backend/prisma/auto-apply.prisma` (2 migrations). Covers `AJA-DATA-001`, `AJA-DATA-002`/`AJA-PROD-007` (as new-model-only constraints, not applied to the existing tracker), `AJA-DATA-003`, `AJA-PROFILE-001/002/003`, `AJA-RULE-001` (eligibility engine), `AJA-SEC-001` (consent model). `AJA-LIFE-001` was built as a new validated state machine for `JobApplication` only — the tracker's `transitionStatus` was left untouched. 131 tests, typecheck/lint clean, verified end-to-end against a live Postgres instance. `AJA-PROFILE-003`'s model is named `ApprovedResumeVersion` (not `ResumeVersion`) to avoid the naming collision flagged in the overview doc.

## Goal

Build the data model and core services every later wave depends on: the submission entity, the candidate application profile, the verified answer library, and the hard eligibility engine. **Still no submission capability** — nothing in this wave sends an application anywhere.

## Ordered tickets

Order follows the dependency chain in `zip/auto-job-apply-production-tickets/15-dependency-map.md`: decisions → data model → profile/answers → eligibility → consent → validated state machine.

1. **`AJA-DATA-001`** — `JobApplication` submission entity + attempt model.
   Implements `AJA-PROD-006`: a new `JobApplication` model (submission-focused: `userId`, `jobId`, `channel`, `status`, `matchScore`, `eligibilityResult` Json, `resumeId`, `coverLetterId?`, `approvalMode`, `approvedAt?`, `submittedAt?`, `externalApplicationId?`, `externalConfirmationUrl?`, `failureCode?`, `failureMessage?`) plus a separate `ApplicationSubmissionAttempt` model recording each individual submit try (for retry-safety accounting). Create in a **new** file `backend/prisma/job-applications.prisma` — do not add these to `applications.prisma`, which stays owned by the recruitment tracker. New migration required.

2. **`AJA-DATA-002`** — Real DB-level duplicate constraints.
   Today's `Application` model only has plain `@@index([userId, normalisedJobUrl])` — not unique — so duplicate checks are service-level only and race-prone (and `MANUAL`-source applications have no check at all). Add `@@unique` constraints for `(userId, jobId)` where `jobId` is set and `(userId, normalisedJobUrl)` where set, on both the existing `Application` tracker model and the new `JobApplication` submission model, per the `AJA-PROD-007` hard-block policy.

3. **`AJA-DATA-003`** — Canonical and fuzzy duplicate detection.
   Add a `canonicalJobId` concept (company + normalized title + location, or an actual canonical job identifier once one exists) for cross-source duplicate detection beyond the exact-URL/exact-jobId case. Implements the "canonical-job-id hard check + fuzzy warning" half of `AJA-PROD-007`. Depends on `AJA-DATA-002` landing first (constraints exist before fuzzy logic layers on top).

4. **`AJA-PROFILE-001`** — Candidate Application Profile.
   Extend the existing `CandidateProfile` model (`backend/prisma/resumes.prisma`, unique per `userId`) — do not create a parallel identity model. Add apply-specific data: `preferences` (desired roles, preferred locations, remote preference, expected salary range, notice period, willing-to-relocate, requires-sponsorship), `links` (LinkedIn/GitHub/portfolio), and field-level verification metadata (source, `lastVerifiedAt`, confidence, `autoSubmitAllowed` per field or field-group). No dependency on other Wave 2 tickets — can start immediately.

5. **`AJA-PROFILE-002`** — Verified Application Answers Library.
   New `ApplicationAnswerProfile` model: `userId`, `questionKey` (canonical catalog: `work_authorization_*`, `sponsorship_required`, `notice_period`, `expected_salary`, `willing_to_relocate`, `years_experience_<skill>`, `interest_reason`, etc.), `answer`, `source` (`USER_VERIFIED` only — AI must never write this table directly), `lastVerifiedAt`, `sensitive: boolean`, `autoSubmitAllowed: boolean`. Implements the `AJA-PROD-005` policy at the data layer: sensitive/demographic question keys must default `autoSubmitAllowed: false` and reject attempts to set it true. Full CRUD API following the Wave-1 RBAC/route pattern. Depends on `AJA-PROD-005` (already locked in the overview doc).

6. **`AJA-PROFILE-003`** — Approved resume versions for selection.
   New `ApprovedResumeVersion` model — **deliberately not named `ResumeVersion`**, since that name is already taken by the resume-builder tailoring feature in `resumes.prisma` (tied to `ResumeAnalysis.id`). This new model links a `Resume` to a category label (e.g. "Backend", "Frontend", "Full-stack") and an approved/active flag, so the planner (Wave 3) can select the right resume per job category.

7. **`AJA-RULE-001`** — Hard eligibility engine.
   New `ApplicationRule`/`ApplicationPreference` models + an `EligibilityService` that evaluates, per job: work authorization, sponsorship requirement, location/remote match, min/max experience, salary floor, company blacklist, title/source exclusion, previously-applied (duplicate), job closed/expired, daily/weekly limits. **Explicitly separate from and never substituting for** the recommendation engine's match-score filters (`modules/recommendations/`) — a high semantic match can still fail hard eligibility. Depends on `AJA-PROFILE-001` (needs preference data) and the `AJA-PROD-003` autopilot-limits decision (already locked, though full autopilot enforcement is Wave 6's `AJA-RULE-002` — this ticket only needs the limit _values_ to check against, not the pause/blacklist UI).

8. **`AJA-SEC-001`** — Application consent model and enforcement.
   New `ApplicationConsent` model: versioned consent records (what the user is authorizing — e.g. "use my approved resume," "generate job-specific content," "submit via my connected email," "submit under autopilot rules") with `grantedAt`, `revokedAt?`, `version`. Required before any Wave 3 approval action or Wave 4 auto-send; must be checked, not assumed. Add new RBAC permission keys (`applications.autoapply.consent.*.own`) per the Wave-1 pattern.

9. **`AJA-LIFE-001`** — Validated state machines.
   `application.service.ts#transitionStatus` currently accepts any-to-any transitions and hardcodes `changedBy: 'USER'` despite `StatusChangedBy` supporting `SYSTEM`/`IMPORT`/`AI`. Replace with an explicit validated transition graph for the existing recruitment `ApplicationStatus`, and define a **separate** transition graph for the new `JobApplication` submission status (`DISCOVERED → MATCHED → APPLICATION_PLANNING → INFORMATION_REQUIRED/READY_FOR_REVIEW → APPROVED → QUEUED → SUBMITTING → SUBMITTED/SUBMISSION_FAILED/ACTION_REQUIRED → CONFIRMATION_RECEIVED`), keeping the two lifecycles independent per `AJA-PROD-006`. Wire real `changedBy` values from calling context instead of the hardcoded `USER`.

## Definition of done

- [ ] Verified answers and profile data are queryable and scoped to `userId` only (IDOR test per Wave 1's template).
- [ ] Sensitive/demographic answer keys cannot be marked `autoSubmitAllowed: true` at the data layer.
- [ ] Duplicate `(userId, jobId)` / `(userId, normalisedJobUrl)` combinations are rejected by the database, not just application code.
- [ ] Eligibility evaluation is demonstrably independent of recommendation match score (same job can be high-match and `NOT_ELIGIBLE`).
- [ ] `transitionStatus` rejects invalid transitions on both the recruitment and submission state machines.
- [ ] Consent must exist and be unrevoked before any consent-gated action is even queryable as available.
- [ ] No submission occurs anywhere in this wave — verify no adapter/queue code was added.
- [ ] New migration(s) applied cleanly against a fresh database (matches existing `prisma/migrations/` conventions).
