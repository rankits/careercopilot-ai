# Wave 6 — Partner ATS + Controlled Autopilot

See [00-overview-and-decisions.md](00-overview-and-decisions.md) for repo conventions and locked decisions. Requires Waves 4 (queue/adapter infrastructure) and 5 (or can run parallel to 5 — no direct dependency between browser-assisted and ATS/autopilot).

> **Implementation status: not started — genuinely blocked, not just unscheduled.** `AJA-ATS-001` needs a real, signed partner/employer ATS agreement before any adapter can be registered — there is nothing to build against without one. `AJA-RULE-002` (autopilot enforcement) is blocked for a more fundamental reason discovered while building Wave 4: `AJA-PROD-003` restricts autopilot to email + authorized-ATS channels only, precisely because those are the only channels that don't require a human in the loop — and neither exists yet (email is on hold pending OAuth credentials, ATS needs a partnership). The one channel that _is_ working today, `EXTERNAL_MANUAL`, is by definition not autopilot-eligible — a human must open the link and fill the form themselves. Building "autopilot scheduling" logic with zero eligible channels to submit through would be dead code, so this wave has been left alone rather than built partially. The `ApplicationRule` config schema (limits, blacklist, `autopilotEnabled` flag) already exists from Wave 2 and needs no further schema work when this wave does become unblocked.

## Goal

Authorized-partner ATS submission, and rule-gated full autopilot. **This is the only wave where "submit without per-application human review" is allowed at all**, and only under the strict conditions locked in `AJA-PROD-003`.

## Ordered tickets

1. **`AJA-ATS-001`** — Partner-only ATS adapter stubs with authorization gate.
   A `PartnerAtsAdapter` implementation of the Wave 4 `JobApplicationAdapter` interface, but enabled **only** for an explicit, maintained allowlist of employer/ATS partnerships with real API credentials — never enabled by URL pattern-matching alone. Greenhouse/Lever/Ashby detection continues to mean "ingestion source," not "submission authorized," exactly as enforced by the Wave 3 channel detector. This ticket is mostly plumbing (adapter registration, credential storage, allowlist config) until an actual partnership exists; ship it flag-off by default.

2. **`AJA-RULE-002`** — Autopilot rules, limits, blacklist, and pause controls.
   Implements the full `AJA-PROD-003` policy as a real, live-editable service: daily/weekly application caps (≤5/day default), minimum match-score threshold (0.85 default), channel restriction (email + authorized-ATS only), company blacklist, job-title exclusions, source exclusions, and a **mandatory, immediate-effect pause control**. This is what finally replaces the Wave 1 removal of the Sidebar's hardcoded "3/5 applications today" — the Sidebar (or a dedicated autopilot settings page) now displays real numbers sourced from this service. Depends on `AJA-RULE-001` (Wave 2 hard eligibility engine) and `AJA-SEC-001` (Wave 2 consent — autopilot needs its own explicit consent grant, distinct from per-application approval consent).

## Definition of done

- [ ] No ATS submission ever fires for a job whose provider isn't on the explicit partner allowlist, regardless of URL/provider-enum match.
- [ ] Autopilot never exceeds the configured daily/weekly limit — verify with a limit-boundary test.
- [ ] Autopilot never submits below the configured minimum match score.
- [ ] Pausing autopilot takes effect immediately — any already-queued-but-not-yet-submitted application is held, not sent.
- [ ] Blacklisted companies/titles are hard-excluded from autopilot eligibility, not just deprioritized.
- [ ] Autopilot requires its own explicit consent grant, separate from "approve this one application" consent.
- [ ] Every autopilot-submitted application still passes through the full Wave 2–4 pipeline (eligibility, duplicate check, queue revalidation) — autopilot skips _human review_, never the safety checks.
