# Wave 4 — Email + External MVP + Submission Queues

See [00-overview-and-decisions.md](00-overview-and-decisions.md) for repo conventions and locked decisions. Requires Wave 3 complete (planner, API, review UI, consent all functional).

> **Implementation status: everything buildable without external credentials is done; `AJA-EMAIL-001` (Gmail OAuth) is explicitly deferred at the user's direction until real Google Cloud OAuth credentials exist — none are present in this project today.**
> Done: `AJA-QUEUE-002` (`SubmissionAttemptOutcome` taxonomy + classification, already in the Wave 2 schema, now actually used), `AJA-BE-002` (`JobApplicationAdapter` registry with a fully functional `ExternalRedirectAdapter` — email/ATS/browser adapters intentionally unregistered), `AJA-QUEUE-001` (RabbitMQ producer/worker mirroring `email.queue.ts`/`email.worker.ts`, with atomic claim-based locking, job/consent revalidation, and never-auto-retry-UNKNOWN semantics), plus new `approve`/`queue`/`confirm`/`retry` endpoints wiring `READY_FOR_REVIEW → APPROVED → QUEUED → SUBMITTING → SUBMITTED/ACTION_REQUIRED/SUBMISSION_FAILED`. `AJA-EMAIL-002` (vacancy email discovery) is done as a pure text-extraction utility over the job's own description — deliberately does **not** unlock the `EMAIL` channel by itself, since finding an address isn't the same as being authorized to send from it.
> **Deferred**: `AJA-EMAIL-001` — the `ConnectedMailbox` OAuth model/flow was not built at all (not even inert scaffolding), per explicit user direction, rather than shipping code that can't be verified. `EMAIL` channel stays unreachable in `ChannelDetectionService` until this lands.
> Verified: typecheck/lint clean on both backend and frontend, `tsc -b && vite build` succeeds, 679 backend tests passing (zero regressions), and live end-to-end smoke testing against a real Postgres instance — including starting the new `worker:application-submission` process and confirming it connects to RabbitMQ cleanly. The full submit pipeline (queue → worker → adapter → attempt log → status transition) is unit-tested exhaustively but could not be exercised over real HTTP in this session because the local dev database has zero ingested jobs (same limitation noted in Wave 3).

## Goal

Approval-based email application works end-to-end — **the first wave where the system actually submits something on the user's behalf.** This is the real MVP milestone: "Assisted + Approval-based auto-apply via Email/External channel," matching the reference design's own Phase-1 target.

## Ordered tickets

1. **`AJA-EMAIL-002`** — Vacancy email discovery and recipient validation.
   Only send to an email address explicitly associated with the job vacancy or a verified recruiter contact (`careers@`, `jobs@`, `recruitment@`-style addresses sourced from the job listing, never guessed or scraped from unrelated staff). This must land before `AJA-EMAIL-001` because the send-path has no legitimate recipient without it.

2. **`AJA-EMAIL-001`** — Connected mailbox OAuth, draft, and send.
   Implements the `AJA-PROD-004` decision: Gmail OAuth 2.0 (`messages.send` / `drafts.send`), refresh tokens encrypted at rest and revocable, **no password storage**. UX sequence: generate draft automatically → user reviews the first N applications → user enables auto-send for approved rules → background worker sends. New `ConnectedMailbox` model (per-user OAuth grant) and `ApplicationEmail` model (sent message tracking: `messageId`, `threadId`, sent-at, recipient). Depends on `AJA-EMAIL-002` (needs a validated recipient) and `AJA-SEC-001` (Wave 2 consent must authorize "submit via my connected email" before this can send anything).

3. **`AJA-BE-002`** — `JobApplicationAdapter` interface and registry.
   Define the adapter interface:

   ```ts
   interface JobApplicationAdapter {
     provider: string;
     inspectApplication(job: Job): Promise<ApplicationSchema>;
     validate(application: PreparedApplication): Promise<ValidationResult>;
     submit(application: PreparedApplication): Promise<SubmissionResult>;
     getStatus?(externalApplicationId: string): Promise<ApplicationStatus>;
   }
   ```

   Register only `EmailApplicationAdapter` and `ExternalRedirectAdapter` (the tracked-manual-confirm path from `AJA-LIFE-002`) in this wave. `PartnerAtsAdapter` and `BrowserAssistedAdapter` are declared in the registry interface but stay unregistered/flagged off until Waves 5–6 — the registry must support them without the wiring existing yet.

4. **`AJA-QUEUE-002`** — Submission failure and unknown-outcome taxonomy.
   Implements `AJA-PROD-008`: classify every submission attempt outcome as `FAILED_SAFE_TO_RETRY`, `FAILED_DO_NOT_RETRY`, or `SUBMISSION_OUTCOME_UNKNOWN` (e.g., a network timeout _after_ the employer's mail server accepted the message is `UNKNOWN`, not a failure — retrying it would double-submit). Define this taxonomy before the workers that use it.

5. **`AJA-QUEUE-001`** — Submission queues, workers, and locking.
   Follow the exact `email.queue.ts` / `email.worker.ts` pattern documented in the overview doc: add queue/routing-key entries to `MessageQueues`/`MessageRoutingKeys` in `messaging.topology.ts`, a typed job union in a new `backend/src/queues/application-submission.queue.ts` (producer, fire-and-forget from the approve-endpoint request path), and `backend/src/workers/application-submission.worker.ts` + `run-application-submission-worker.ts` (consumer, independent process). Worker sequence per job: reload + lock the `JobApplication` row → revalidate job still active, consent still granted, rules still pass, not already submitted → submit once via the adapter registry → store the sanitized raw response → classify the outcome per `AJA-QUEUE-002` → **never auto-retry `SUBMISSION_OUTCOME_UNKNOWN`**.

## Definition of done

- [ ] No application is ever emailed without prior explicit approval (or, later, a passing autopilot-rule check — not in scope until Wave 6).
- [ ] Emails only ever go to a job/recruiter-validated address — never an inferred or scraped one.
- [ ] Mailbox OAuth tokens are encrypted at rest and revocable from a single action; revoking immediately blocks further sends.
- [ ] Duplicate submission is blocked at the DB unique constraint (Wave 2), the planner idempotency check (Wave 3), and the queue's "not already submitted" revalidation — three independent layers.
- [ ] Workers are idempotent: replaying the same queue message twice does not send twice.
- [ ] A `SUBMISSION_OUTCOME_UNKNOWN` result is never auto-resubmitted by any code path — verify with a forced-timeout test.
- [ ] A user can complete one real email application end-to-end in a test/staging environment: plan → review → approve → queued → sent → tracked.
