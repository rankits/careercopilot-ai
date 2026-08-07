# Wave 5 — Browser-Assisted Application

See [00-overview-and-decisions.md](00-overview-and-decisions.md) for repo conventions and locked decisions. Requires Wave 4 stable in production/staging first — this is explicitly deferred until the email/external MVP is proven, per the source roadmap ("do not start with a server-side browser bot").

> **Implementation status: not started — blocked, not just deferred by sequencing.** A browser extension is a separate client codebase (manifest, content scripts, its own build/release pipeline) outside this repo's scope, and per the roadmap it shouldn't start until Wave 4 is proven stable in real use — which itself needs `AJA-EMAIL-001` (currently on hold, see Wave 4) or meaningful `EXTERNAL_MANUAL` production usage first. Nothing to pick up here until that groundwork exists.

## Goal

Assisted form-fill for sites with no API or email channel (Workday instances, unsupported ATS forms, company career portals) — via a **user-driven browser extension**, not a server-side bot.

## Ticket

**`AJA-EXT-001`** — Browser-assisted signed package and extension contract.

Architecture (from the source design, unchanged):

```
Career Copilot backend
    → creates a signed application package (short-lived, user-scoped)
    → browser extension requests the package
    → extension maps the package to the current page's form fields
    → user reviews highlighted fields
    → user clicks the final submit button themselves
    → extension reports confirmation back to the backend
```

Backend work: a signed-package issuance endpoint (reuses the plan from Wave 3 — resume, cover letter, answers — packaged for the extension), package expiry, and a confirmation-report endpoint that updates the `JobApplication` record via the same adapter-registry/queue path as Wave 4 (register a `BrowserAssistedAdapter` in the Wave 4 registry). Extension itself is a separate client project, out of this repo's immediate scope — this ticket only covers the backend contract it consumes.

**Reiterate the `AJA-EXT-002` (Wave 1) prohibitions explicitly for this ticket, since it's the highest-risk surface for violating them:**

- No CAPTCHA, MFA, or anti-bot bypass — the extension only highlights fields and lets the user click submit; it never automates the final submission action itself.
- No storage of job-board/ATS usernames or passwords in the backend or the extension.
- No silent submission of demographic/sensitive answers — those stay flagged for the user to answer directly in the form, never auto-filled by the extension.

## Definition of done

- [ ] Signed packages are short-lived, single-user-scoped, and expire.
- [ ] The extension never submits a form on the user's behalf — the user always performs the final submit click.
- [ ] No CAPTCHA/MFA/anti-bot circumvention exists anywhere in the extension or backend contract.
- [ ] Confirmation reporting flows through the same `JobApplication` state machine and queue taxonomy Wave 4 established — no parallel/duplicate tracking path.
- [ ] Sensitive/demographic fields are highlighted for manual user entry, never pre-filled.
