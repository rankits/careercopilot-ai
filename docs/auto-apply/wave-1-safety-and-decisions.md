# Wave 1 — Honesty, Security Constraints, Decisions

See [00-overview-and-decisions.md](00-overview-and-decisions.md) for repo conventions and the locked product decisions this wave finalizes in writing.

> **Implementation status: done — all 7 items.** `AJA-EXT-002` (no-bypass policy — `backend/src/shared/security/auto-apply-policy.ts`) and `AJA-SEC-002` (reusable IDOR test helper — `backend/src/test-utils/idor-assertions.ts`) were additive. The remaining 5 required editing existing files, which needed the additive-only constraint explicitly lifted for this wave — once that happened: `AJA-UI-001` (Sidebar's fake Daily Goal removed, including the now-dead `SidebarGoal` styled component), `AJA-ARCH-002` (`backend/src/modules/applications/` deleted — confirmed zero references first), `AJA-ARCH-003` (create-application Swagger now documents only the 4 actually-accepted `sourceType` values, with the full enum kept separately for response-schema accuracy), `AJA-API-002` (added the previously-undocumented `saved-jobs` endpoints to Swagger), `AJA-API-003` (the `PLATFORM_APPLY` tracking note no longer implies Career Copilot submitted anything — relabeled to make clear it's a self-reported tracking entry). Verified: typecheck/lint clean on both sides, `tsc -b && vite build` succeeds, 682 backend tests passing with zero regressions, and a live smoke test confirming the tracker still works end-to-end.

## Goal

Stop the current UI and API from claiming capabilities that don't exist, remove dead/conflicting code, and record the product decisions durably. **No schema changes, no new submission capability** — this wave is entirely cleanup and honesty.

## Why first

Every gap-and-risk item in this wave was flagged P0 in the source analysis specifically because it's either actively misleading (fabricated data, overstated enums) or a security/process prerequisite (IDOR test mandate, no-bypass policy) that every later wave depends on. None of it requires the data model or planner to exist yet, so it can land immediately and independently.

## Ordered tickets

1. **`AJA-UI-001`** — Remove the fabricated Daily Goal.
   `frontend/src/components/organisms/Sidebar/Sidebar.tsx` currently hardcodes a "3/5 applications today" style progress indicator with no backing data. Remove it (or replace with a genuinely empty/neutral state) until Wave 6 (`AJA-RULE-002`) has real autopilot limits to display.

2. **`AJA-ARCH-003`** — Hide unimplemented `ApplicationSourceType` values from the public API.
   The Prisma enum `ApplicationSourceType` (`backend/prisma/applications.prisma`) includes `EMAIL_IMPORT`, `ATS_IMPORT`, `BROWSER_EXTENSION`, `AI_ASSISTED` alongside the ones actually handled by `createApplication` in `application-management/services/application.service.ts` (`MANUAL`, `PLATFORM_JOB`, `PLATFORM_APPLY`, `EXTERNAL_JOB_URL`). Restrict the create-application request validation (`application-management/validations/application.validation.ts`) to only the implemented values; keep the others in the Prisma enum (internal/reserved for later waves) but reject them at the API boundary with a clear error, and don't advertise them in Swagger.

3. **`AJA-ARCH-002`** — Retire the stub `applications` module.
   `backend/src/modules/applications/` (routes/service/types all empty placeholders) is confirmed unreferenced anywhere in `backend/src/routes.ts` or elsewhere in `backend/src`. Delete the module entirely — it exists only to confuse future readers about which module owns `/applications` (the real one is `application-management`).

4. **`AJA-API-003`** — Gate or relabel `PLATFORM_APPLY`.
   Today, creating an application with source `PLATFORM_APPLY` stores "Applied via platform" text but triggers no real submission (see the `PLATFORM_APPLY` branch in `application.service.ts`). Either gate this source behind a feature flag until Wave 4 ships real submission, or relabel it clearly as tracking-only so it can't be confused with an actual auto-apply result.

5. **`AJA-EXT-002`** — Encode the no-bypass constraints as policy.
   Write an explicit, enforceable policy (a short doc + a shared constants/guard module, e.g. `backend/src/shared/security/auto-apply-policy.ts`) stating the hard prohibitions that every later wave's code review must check against:
   - No CAPTCHA, MFA, or anti-bot bypass, ever.
   - No storage of job-board/ATS usernames or passwords in the backend.
   - No submission through a channel not explicitly authorized for that job (no inferring ATS submission rights from a Greenhouse/Lever/Ashby URL match — those providers are ingestion-only today).
   - No silent submission of demographic/sensitive answers.

6. **`AJA-SEC-002`** — Establish the reusable IDOR/authz test pattern.
   `application-management/__tests__/application.security.api.test.ts` already covers this for the tracker (401 unauthenticated, cross-user 403/404 with no data leakage, no `userId`/`x-user-id` spoofing, repository scoped by `userId`). Extract the pattern into a small reusable test helper/fixture (or just document the exact assertions to copy) so every new resource type introduced in Wave 2 onward (profile, answers, plans, mailbox, packages) gets the same coverage from day one instead of retrofitted later.

7. **`AJA-API-002`** — Fix Swagger drift.
   `application.swagger.ts` is missing the `saved-jobs` endpoints entirely and lists source-type enums that overstate current capability. Fix while touching the same validation/swagger files as `AJA-ARCH-003` above.

## Product decisions

Confirm `AJA-PROD-001` through `AJA-PROD-008` are recorded in [00-overview-and-decisions.md](00-overview-and-decisions.md#product-decisions-locked-in) — no separate code change needed for this wave, but every ticket from Wave 2 onward should link back to the specific decision it implements rather than re-deciding it.

## Definition of done

- [ ] No UI element implies an application-tracking or auto-apply capability that doesn't exist (Daily Goal removed).
- [ ] No API/Swagger surface advertises an unimplemented `ApplicationSourceType`.
- [ ] `backend/src/modules/applications/` no longer exists; nothing references it.
- [ ] `PLATFORM_APPLY` no longer implies a real submission occurred.
- [ ] No-bypass policy is written down somewhere code review can point to.
- [ ] A reusable IDOR/authz test template exists and is referenced (not just implicit) for reuse in Wave 2+.
- [ ] Swagger matches implemented routes exactly.
- [ ] Existing tracker test suite (`application-management/__tests__/*`, frontend `ApplicationsPage`/`features/applications` tests) still passes unmodified in behavior.
