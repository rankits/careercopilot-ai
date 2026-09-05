# Wave 3 — Planner, API, and Review UI

See [00-overview-and-decisions.md](00-overview-and-decisions.md) for repo conventions and locked decisions. Requires Wave 2 complete (profile, answer library, eligibility engine, consent model, submission entity all exist).

> **Implementation status: backend done, frontend delivered as a settings-style UI rather than the originally-scoped review/approval modal.**
> Done: `AJA-BE-001` (channel detection — `EXTERNAL_MANUAL`/`UNSUPPORTED` only, `ATS_API`/`EMAIL`/`BROWSER_ASSISTED` deliberately unreachable until their waves land), `AJA-PLAN-001` (`ApplicationPlannerService`, idempotent, walks the state machine forward only — regressing from `READY_FOR_REVIEW` back to `INFORMATION_REQUIRED` throws `PLAN_REGRESSION_UNSUPPORTED` rather than silently corrupting state), full CRUD API surface for every Wave 2/3 resource (`AJA-API-001`-equivalent). Frontend: new `/auto-apply` page (`frontend/src/pages/AutoApplyPage/`) with tabs for Profile, Verified Answers, Resume Versions, Rules, Consents, and Submissions+Plan review — built as a wholly new, additive route rather than modifying the existing job-feed Apply Now flow.
> **Explicitly not done** (separate, larger undertakings): `AJA-AI-001`/`AJA-AI-002` (grounded content generation — needs LangChain integration; the planner reports `contentGenerationAvailable: false` rather than fabricating a cover letter), `AJA-LIFE-002` (wiring the _existing_ `openExternalApply`/job-card Apply Now flow into the tracker — skipped because it requires editing existing frontend files, out of scope for an additive-only pass), `AJA-FE-002`/`AJA-UI-002` (existing tracker UI fixes — same reason).
> Verified: typecheck/lint clean on both backend and frontend, `tsc -b && vite build` succeeds, 131 backend tests passing, and a real end-to-end smoke test against a live Postgres instance (register → profile → rules → answers → sensitive-answer rejection → submissions, all via real HTTP). The full eligibility→channel→plan pipeline is unit-tested (30+ scenarios) but could not be exercised end-to-end in this session because the local dev database has zero ingested jobs.

## Goal

A user can generate and review a complete application plan for external/email-ready jobs, and approve it. **Still no real submission** — this wave produces the plan and the approval UI; Wave 4 wires approval to an actual send.

## Ordered tickets

1. **`AJA-BE-001`** — Application channel detection.
   New classifier returning `ATS_API_AUTHORIZED | EMAIL_SUPPORTED | BROWSER_ASSISTED | EXTERNAL_MANUAL | UNSUPPORTED` per job. Critical constraint from `AJA-PROD-002`: detecting a Greenhouse/Lever/Ashby URL **must not** imply `ATS_API_AUTHORIZED` — those providers (`backend/src/modules/jobs/providers/*`) are ingestion-only today with no submission credentials. Until Wave 6 grants partner authorization, the classifier can only ever return `EXTERNAL_MANUAL`, `EMAIL_SUPPORTED` (once a vacancy email is known), or `UNSUPPORTED`.

2. **`AJA-AI-002`** — Sensitive-question and factual-safety gates.
   Guardrails that must exist **before** any generation ticket: block AI from inventing degrees, employment history, years of experience, certifications, salary, work authorization, disability/demographic info, or security clearance. Enforce that any answer the AI cannot ground in `ApplicationAnswerProfile`/`CandidateProfile` evidence becomes `USER_INPUT_REQUIRED`, not a guess.

3. **`AJA-AI-001`** — Grounded cover-letter and screening-answer generation.
   Job-specific cover letter + screening-answer generation, each output carrying a confidence score and evidence references (e.g. `{ type: 'EMPLOYMENT', recordId }`). Confidence ≥0.90 from a verified source → usable without review; 0.70–0.89 → flagged for review; <0.70 → not auto-filled. Gated by `AJA-AI-002` landing first.

4. **`AJA-PLAN-001`** — `ApplicationPlannerService`.
   The central orchestrator: `createPlan(userId, jobId)` — checks duplicate (Wave 2), evaluates eligibility (Wave 2), computes/reads match score, selects an `ApprovedResumeVersion` (Wave 2), detects channel (this wave), prepares answers via the answer library + generation (this wave), identifies unresolved/sensitive questions, and returns a decision: `NOT_ELIGIBLE | INFORMATION_REQUIRED | READY_FOR_REVIEW | READY_FOR_APPROVAL | READY_FOR_AUTOPILOT | UNSUPPORTED_CHANNEL`. Must be **idempotent** per `(userId, jobId, inputs-hash)` — regenerating a plan when nothing relevant changed returns the existing plan rather than creating a new one; a real input change (profile edit, rule change, job update) invalidates the prior plan and creates a new version.

5. **`AJA-API-001`** — Auto Apply API surface.
   New endpoints for readiness check, plan create/get/regenerate, approve/reject, bulk-approve, queue/cancel (queue endpoint itself is a Wave 4 no-op until the queue exists), and plan history — under `/api/v1/applications` (extending the existing module) or a new `/api/v1/auto-apply` namespace, whichever keeps route ownership clearest. Shared error codes across this and all later API tickets: `APPLICATION_EXISTS`, `NOT_ELIGIBLE`, `INFORMATION_REQUIRED`, `CONSENT_REQUIRED`, `UNSUPPORTED_CHANNEL`, `SUBMISSION_OUTCOME_UNKNOWN`. New RBAC permission keys per the Wave-1 pattern (e.g. `applications.autoapply.plan.create.own`, `.approve.own`).

6. **`AJA-LIFE-002`** — Wire external Apply Now to the tracker.
   `frontend/src/features/jobs/utils/openExternalApply.ts` currently just calls `window.open(applyUrl)` with no backend call at all — the tracker stays completely disconnected from the apply action. Change it to also create/update an `Application` tracking record (status `ACTION_REQUIRED` until the user confirms they actually applied, then `APPLIED`), reusing the existing `POST /applications` (`EXTERNAL_JOB_URL` source) flow. Affects `JobFeedPage`, `ForYouPage`, `JobDetailPage`.

7. **`AJA-FE-001`** — Application review and approval UI.
   New page/route displaying a generated plan: match score, eligibility result, selected resume, generated cover letter, answers (with confidence and unresolved/sensitive flags called out), channel, and an approve/reject action. This is the first UI surface that actually shows planner output — the existing `ApplicationsPage` detail modal is a tracker view, not a plan-review view; build this as new, don't repurpose the tracker modal.

8. **`AJA-FE-002`** — Replace the mock job-feed picker.
   `AddApplicationDialog`'s "add from job feed" flow currently uses a static `jobFeedPickerJobs` mock array. Replace with the real job-listing API (`/api/v1/jobs`).

9. **`AJA-FE-003`** — Expose `EXTERNAL_JOB_URL` entry mode per product surface.
   `visibleAddApplicationEntryModes` currently hides the manual-external-URL entry point in some surfaces; make it consistently available now that Apply Now (`AJA-LIFE-002`) also produces `EXTERNAL_JOB_URL` records, so both paths converge on the same data shape.

10. **`AJA-UI-002`** — Real status-tab counts.
    Replace the em-dash placeholders in the `ApplicationsPage` status tabs with real counts from the backend (a small aggregate query, not a UI-only fix).

## Definition of done

- [ ] Channel detection never returns `ATS_API_AUTHORIZED` for an unauthorized provider — verify with a Greenhouse/Lever-sourced job and assert it comes back `EXTERNAL_MANUAL` or `EMAIL_SUPPORTED`, never ATS.
- [ ] AI-generated content never fills a field with no evidence — assert an unanswerable question comes back `USER_INPUT_REQUIRED`, not a guess.
- [ ] Calling `createPlan` twice with unchanged inputs returns the same plan (idempotency).
- [ ] A plan for a `NOT_ELIGIBLE` job never reaches `READY_FOR_APPROVAL`.
- [ ] External URLs opened via Apply Now are validated the same way `safe-apply-url.ts` already validates them elsewhere (http/https only).
- [ ] Review UI surfaces every unresolved/sensitive question before allowing approval — no silent "approve everything" path.
- [ ] New endpoints pass the Wave-1 IDOR/authz test template (401 unauth, no cross-user leakage).
- [ ] Tracker (`ApplicationsPage`, `application-management`) tests still pass unmodified in behavior.
