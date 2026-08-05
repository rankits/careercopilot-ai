# Pre-Application Intelligence and Form Analysis

**Status:** Spec only — not implemented yet  
**Goal:** Before Assisted/Auto Apply starts, understand what the *job* and *application form* require, then feed that into the existing Application Readiness Gate.  
**Golden fixture:** Linear — Mobile Product Designer  
`https://jobs.ashbyhq.com/linear/eac7f181-d658-4943-9430-51bae2bcd110`

---

## Why this exists

Today readiness evaluates **candidate-side** facts well (profile, answers, resume, limits, channel). It does **not** extract job-side hard rules such as:

- Remote ≠ globally eligible (Linear: North America only)
- Minimum experience / mobile-specific experience
- Sponsorship / work-authorization statements on the posting
- Exact form questions (Ashby is JS-rendered; backend HTML alone is incomplete)

Without this layer, Assisted Apply can plan an application that looks ready while the candidate is location-ineligible or missing job-specific evidence.

---

## Where it fits (current stack)

```text
Job discovered / user clicks Prepare Application / Assisted Apply / Autopilot / Extension
    ↓
① Job Posting Analyzer          ← backend MVP
② Application Form Inspector    ← later (browser / authorized ATS API)
    ↓
Normalize requirements + questions (with confidence + evidence)
    ↓
③ Resume Match (if candidate allows)  ← via stable port; see section below
    ↓
Compare vs profile, Answer Vault, resume, portfolio + match snapshot
    ↓
ApplicationReadinessService.evaluate(stage)   ← already exists
    ↓
Progressive information collection → application package → channel-specific submit
```

**Existing code to extend (do not fork):**

| Piece | Location | Notes |
| ----- | -------- | ----- |
| Readiness gate | `services/application-readiness.service.ts` | Add analysis-backed rules; keep fail-closed |
| Match score lookup | `IMatchScoreLookup` / `PrismaMatchScoreLookup` | Today reads `JobRecommendation.overallScore` |
| Reason codes | `constants/readiness-reason-codes.ts` | Add job-requirement codes |
| Channel detection | `services/channel-detection.service.ts` | Ashby URL ≠ ATS_API auth; stay `EXTERNAL_MANUAL` |
| Planner | `services/application-planner.service.ts` | Consume analysis + match for gaps + package |
| Consents | `RESUME_USAGE` (+ later match-specific if needed) | Gate matching before scoring |
| Assisted Apply entry | FE `useTrackAndOpenApply` + Job Detail | Later: “Prepare Application” CTA |

---

## Two analyzers

### 1. Job Posting Analyzer (MVP)

**When:** job ingest (optional) and/or **Prepare Application** if snapshot stale.  
**Sources:** public HTML, JSON-LD, provider URL patterns, public job-posting metadata (e.g. Ashby public posting pages).  
**Never** write AI output straight into canonical `Job` columns without provenance — persist as analysis entities.

Extract (at minimum for MVP):

- Provider (`ASHBY`, `GREENHOUSE`, `LEVER`, `WORKDAY`, `UNKNOWN`)
- Application / job page URLs
- Active vs closed (best-effort)
- Hard requirements with evidence: region, experience years, sponsorship, work auth, portfolio, certifications
- Skills / preferences as soft signals (warnings, not hard blocks unless high confidence + evidence)

### 2. Application Form Inspector (post-MVP)

**When:** user opens the real apply page, or authorized ATS form API is available.  
**Sources:** browser extension / in-page assistant for JS forms; never pretend backend JD scrape = full form.

Extract: fields, required/optional, types, options, file requirements, limits, consent, knockouts, CAPTCHA/auth/MFA, submission capability.

Until form is inspected:

```json
{
  "formStatus": "NOT_INSPECTED",
  "submissionCapability": "EXTERNAL_MANUAL",
  "finalSubmissionRequiresUser": true
}
```

---

## Explicit analysis statuses

Do not claim complete form analysis from a job description alone.

```text
JOB_PAGE_ANALYZED
FORM_SCHEMA_PARTIAL
FORM_SCHEMA_COMPLETE
BROWSER_INSPECTION_REQUIRED
AUTHENTICATION_REQUIRED
CAPTCHA_PRESENT
UNSUPPORTED
```

Suggested persistence enums:

```ts
type JobPageStatus = 'PENDING' | 'COMPLETE' | 'PARTIAL' | 'FAILED';
type FormStatus =
  | 'NOT_INSPECTED'
  | 'PARTIAL'
  | 'COMPLETE'
  | 'BROWSER_REQUIRED'
  | 'UNSUPPORTED';
type SubmissionCapability =
  | 'AUTHORIZED_API'      // only with real partner credentials
  | 'EMAIL'
  | 'BROWSER_ASSISTED'    // future extension package
  | 'EXTERNAL_MANUAL'     // current Ashby default
  | 'UNSUPPORTED';
```

---

## Domain model (analysis layer)

Separate from permanent job fields. Suggested Prisma/models later:

```text
ApplicationPageAnalysis
ApplicationRequirement      // or JSON on analysis for MVP
ApplicationFormField
ApplicationQuestion
ApplicationFieldMapping
ApplicationPageSnapshot    // raw HTML/text + hash + fetchedAt
```

### Core types (copy into `types/` when implementing)

```ts
export interface ApplicationPageAnalysis {
  id: string;
  jobId: string;
  jobApplicationId?: string;

  provider: string; // ASHBY | ...
  jobPageUrl: string;
  applicationUrl?: string;

  jobPageStatus: 'PENDING' | 'COMPLETE' | 'PARTIAL' | 'FAILED';
  formStatus:
    | 'NOT_INSPECTED'
    | 'PARTIAL'
    | 'COMPLETE'
    | 'BROWSER_REQUIRED'
    | 'UNSUPPORTED';
  submissionCapability:
    | 'AUTHORIZED_API'
    | 'EMAIL'
    | 'BROWSER_ASSISTED'
    | 'EXTERNAL_MANUAL'
    | 'UNSUPPORTED';

  requirements: ExtractedRequirement[];
  fields: ExtractedApplicationField[];

  analyzedAt: Date;
  expiresAt: Date;
}

export interface ExtractedRequirement {
  code: string; // WORK_REGION | TOTAL_EXPERIENCE_YEARS | MOBILE_DESIGN_EXPERIENCE | ...
  operator?: 'IN' | 'GTE' | 'LTE' | 'EQ' | 'REQUIRED';
  value: unknown;
  required: boolean;

  confidence: number; // 0..1
  extractionMethod:
    | 'STRUCTURED_DATA'
    | 'PROVIDER_API'
    | 'DOM_RULE'
    | 'AI_EXTRACTION'
    | 'USER_CONFIRMED';

  sourceText?: string;
  sourceUrl: string;
  sourceSelector?: string;

  reviewStatus:
    | 'AUTO_ACCEPTED'
    | 'REVIEW_REQUIRED'
    | 'USER_CONFIRMED'
    | 'REJECTED';
}

export interface ExtractedApplicationField {
  externalKey: string;
  label: string;
  type: 'TEXT' | 'LONG_TEXT' | 'URL' | 'FILE' | 'SELECT' | 'BOOLEAN' | 'NUMBER' | 'DATE' | 'UNKNOWN';
  required: boolean;
  options?: string[];
  mapping?: string | null; // e.g. user.fullName | approvedResume | profile.links.portfolio
  characterLimit?: number;
}
```

**User corrections** attach to the analysis row (`reviewStatus`, override value) — never silently rewrite the original job description.

---

## Confidence policy (readiness consumption)

| Confidence / source | Gate behavior |
| ------------------- | ------------- |
| Structured field or exact quoted statement | May hard-block |
| High confidence AI + quoted evidence | May block; always show evidence in UI |
| Medium confidence | `INFORMATION_REQUIRED` / user review — do not auto-fail eligibility |
| Low confidence | Warning only — never hard-block |

Wire into readiness via optional:

```ts
// extend ApplicationReadinessInput later
applicationAnalysisId?: string;
```

Evaluate examples:

- Candidate verified work region vs `WORK_REGION`
- Experience years vs `TOTAL_EXPERIENCE_YEARS`
- Sponsorship need vs employer sponsorship statement
- Portfolio vs portfolio requirement / form field
- Verified Answer Vault vs known questions
- Approved resume vs file requirements
- Adapter support vs detected provider (**Ashby → EXTERNAL_MANUAL**, not AUTHORIZED_API)

New reason codes (add when implementing):

```text
WORK_REGION_VERIFICATION_REQUIRED
JOB_LOCATION_REQUIREMENT_NOT_MET
EXPERIENCE_REQUIREMENT_UNKNOWN
EXPERIENCE_REQUIREMENT_NOT_MET
MOBILE_DESIGN_EVIDENCE_REQUIRED
PORTFOLIO_EVIDENCE_REQUIRED
FORM_INSPECTION_REQUIRED          // warning / info
ANALYSIS_STALE                    // reanalyze before submit
ANALYSIS_UNAVAILABLE              // do not claim eligibility from missing analysis
```

---

## Resume matching integration

Resume matching is **ongoing development** (recommendations scoring + For You + possible resume-analysis ATS paths). Pre-Application Intelligence must **not** import recommendation internals or resume-analysis AI clients directly. It talks only to a **stable port** owned by auto-apply.

### How it fits the flow

```text
Page analysis complete (requirements + JD text snapshot)
        ↓
Candidate allowed resume matching?   (consent: RESUME_USAGE)
        ├─ No  → skip match; readiness keeps matchScore as WARNING / optional
        └─ Yes
             ↓
         Approved / selected resume available?
             ├─ No  → INFORMATION_REQUIRED (resume)
             └─ Yes
                  ↓
              IApplicationMatchPort.ensureMatch(...)
                  ↓
              Persist ApplicationMatchSnapshot on application / analysis
                  ↓
              Readiness uses snapshot.overallScore vs minMatchScore
                  ↓
              Package includes score + gaps for Assisted / Autopilot / Extension
```

**Order matters:** hard eligibility from page analysis (region, sponsorship) runs in readiness **before** treating a high match score as “ready.” A great resume match does not override North America ineligibility.

Analysis improves matching (optional input), it does not replace it:

| From page analysis | Into match (as `MatchJobHints`, optional) |
| ------------------ | ---------------------------------------- |
| Extracted skills / requirements | Prefer these over raw HTML scrape alone |
| Job title / company | Context for scoring |
| JD snapshot text | Fallback corpus if job row is thin |
| Hard requirements (region, years) | **Not** scored as soft keywords — readiness rules |

### Stable port (insulate from matcher churn)

Own these types under auto-apply (`types/application-match.types.ts`). Adapters live in `adapters/` and are the **only** place that may call recommendations or resume-analysis.

```ts
/** Caller identity — same port used by every apply channel. */
export type ApplicationMatchTrigger =
  | 'PREPARE_APPLICATION'
  | 'ASSISTED_APPLY'
  | 'AUTOPILOT'
  | 'EXTENSION'
  | 'PLAN_REFRESH';

export type ApplicationMatchStatus =
  | 'READY'
  | 'CACHED'
  | 'SKIPPED_NO_CONSENT'
  | 'SKIPPED_NO_RESUME'
  | 'SKIPPED_FEATURE'
  | 'PENDING'
  | 'FAILED';

/** Opaque-stable snapshot — do not mirror RecommendationScoreResult 1:1. */
export interface ApplicationMatchSnapshot {
  status: ApplicationMatchStatus;
  overallScore: number | null; // 0..1 when READY/CACHED
  displayScore: number | null; // 0..100 convenience
  resumeVersionId?: string;
  jobId: string;
  analysisId?: string;

  /** Soft evidence for UI — keys may grow; consumers treat as optional. */
  matchedSkills?: string[];
  missingSkills?: string[];
  reasons?: Array<{ code?: string; message: string }>;

  /** Provider-agnostic bag; never required by readiness. */
  components?: Record<string, number>;

  source: 'RECOMMENDATIONS' | 'RESUME_ANALYSIS' | 'EXTERNAL' | 'NONE';
  computedAt?: Date;
  errorCode?: string;
}

export interface EnsureApplicationMatchInput {
  userId: string;
  jobId: string;
  jobApplicationId?: string;
  analysisId?: string;
  resumeVersionId?: string; // preferred approved resume; matcher may resolve default
  trigger: ApplicationMatchTrigger;
  /** Optional hints from page analysis — matcher may ignore unknown fields. */
  jobHints?: {
    title?: string;
    company?: string;
    descriptionText?: string;
    requiredSkills?: string[];
    preferredSkills?: string[];
  };
  /** If false, only return cached score (no AI / heavy recompute). */
  allowCompute?: boolean;
}

export interface IApplicationMatchPort {
  /**
   * Ensure a trusted match snapshot exists for this user+job.
   * Must be idempotent. Must not throw for skip paths — return status instead.
   */
  ensureMatch(input: EnsureApplicationMatchInput): Promise<ApplicationMatchSnapshot>;

  /** Read-only; used by readiness when score already stamped. */
  getLatest(userId: string, jobId: string): Promise<ApplicationMatchSnapshot | null>;
}
```

**Adapter strategy (swap without rewriting apply flows):**

```text
IApplicationMatchPort
  └─ ApplicationMatchFacade
        ├─ Consent check (RESUME_USAGE)
        ├─ Cache: JobApplication.matchScore / JobRecommendation row
        └─ Active backend (wired once in DI):
              RecommendationsMatchAdapter   ← current production path
              ResumeAnalysisMatchAdapter    ← optional later / A/B
              NoopMatchAdapter              ← tests / feature off
```

Rules that keep churn from breaking apply:

1. **Auto-apply never imports** `RecommendationScoringEngine`, For You controllers, or resume-analysis AI clients.
2. **Only the adapter** maps provider DTOs → `ApplicationMatchSnapshot`.
3. **Readiness only reads** `overallScore` + status (same as today’s `IMatchScoreLookup`; evolve lookup to call `getLatest` or keep both in sync).
4. **New score dimensions** (e.g. Linear craft weights) go in `components` / `reasons` — readiness threshold stays on `overallScore` until product explicitly adds new gates.
5. **Version the port**, not the provider: if snapshot shape must change, add optional fields; do not rename `overallScore`.

### Consent and “if candidate allows”

| Condition | Behavior |
| --------- | -------- |
| No `RESUME_USAGE` (or future `RESUME_MATCHING`) consent | `SKIPPED_NO_CONSENT` — do not call matcher; do not invent a score |
| Consent revoked mid-flow | Treat as skip; clear pending compute |
| Autopilot without consent | Fail closed for match-dependent thresholds; do not silent-score |
| User opts out of AI match but allows heuristic | Adapter decision — port still returns a snapshot with `source` |

UI copy: “Match this job to your resume” toggle / consent already granted in Auto Apply settings.

### Shared orchestration service (one entry for all channels)

```ts
// Conceptual — PrepareApplicationService / ApplicationIntelligenceOrchestrator
async prepare(input): Promise<PrepareApplicationResult> {
  const analysis = await pageAnalyzer.analyzeOrGetFresh(jobId);
  const match = await matchPort.ensureMatch({
    userId, jobId, analysisId: analysis.id,
    resumeVersionId, trigger: input.trigger, // ASSISTED | AUTOPILOT | EXTENSION | ...
    jobHints: toMatchJobHints(analysis),
    allowCompute: input.allowCompute ?? true,
  });
  const readiness = await readinessService.evaluate({ userId, jobId, stage, applicationAnalysisId: analysis.id });
  const pkg = await packageBuilder.build({ analysis, match, readiness, ... });
  return { analysis, match, readiness, package: pkg };
}
```

Same `prepare()` (or thinner wrappers) for:

| Channel | Trigger | Match behavior | Submit |
| ------- | ------- | -------------- | ------ |
| Prepare Application (UI) | `PREPARE_APPLICATION` | Compute if stale + consented | None yet |
| Assisted Apply | `ASSISTED_APPLY` | Prefer cache; compute if missing | EXTERNAL_MANUAL + user |
| Full Autopilot | `AUTOPILOT` | Require READY score ≥ min (or configured policy) | Queue / adapter |
| Browser extension | `EXTENSION` | Cache preferred; on-demand if JD updated | Prefill package only |
| Plan refresh | `PLAN_REFRESH` | `allowCompute: false` unless analysis changed | N/A |

### What matching does *after* analysis (product behavior)

When match runs successfully, apply flows should:

1. **Stamp** `JobApplication.matchScore` (already supported) from snapshot  
2. **Surface** matched / missing skills next to extracted requirements  
3. **Feed** missing skills into progressive questions / draft answers (not as hard eligibility unless policy says so)  
4. **Prefer** resume version that scores best among approved versions (optional Phase 4+; MVP uses user-selected / single approved)  
5. **Enrich** application package:

```json
{
  "selectedResumeId": "...",
  "match": {
    "status": "READY",
    "overallScore": 0.86,
    "displayScore": 86,
    "matchedSkills": ["Figma", "iOS", "Android"],
    "missingSkills": ["Origami"],
    "source": "RECOMMENDATIONS"
  },
  "selectedPortfolioProjects": [],
  "prefillFields": {},
  "draftAnswers": [],
  "submissionMode": "EXTERNAL_MANUAL",
  "provider": "ASHBY",
  "finalSubmissionRequiresUser": true
}
```

### Readiness interaction (today vs after)

| Today | After this feature |
| ----- | ------------------ |
| `IMatchScoreLookup` reads latest `JobRecommendation` | Prefer `IApplicationMatchPort.getLatest` / stamped application score |
| Missing score = WARNING at PLAN | Unchanged unless Autopilot policy requires score |
| Below `minMatchScore` = block | Unchanged; score still from port |
| No explicit consent check on lookup | `ensureMatch` enforces consent before compute; cached read may still return prior score with disclosure |

Do **not** block PLAN solely because match was skipped for consent — ask for consent or continue with warning. Autopilot may require consent + score by policy.

### Failure / skip behavior

| Case | Snapshot status | Apply impact |
| ---- | --------------- | ------------ |
| No consent | `SKIPPED_NO_CONSENT` | Warning; progressive “Allow resume matching” |
| No resume | `SKIPPED_NO_RESUME` | INFORMATION_REQUIRED resume |
| Matcher down / timeout | `FAILED` | Warning at PLAN; Autopilot may defer job |
| Stale analysis + fresh match | Re-run match when `allowCompute` and analysisId changed | Keep scores tied to analysis when possible |

### Linear fixture + match

After page analysis extracts mobile / iOS / Android / prototyping:

- Match should use JD + hints, not keywords alone  
- Missing mobile evidence → match may still produce a score, but readiness / progressive collection still asks for portfolio / years (analysis rules win for hard requirements)  
- High matchScore with failed `WORK_REGION` → still `NOT_ELIGIBLE`

---

## Progressive information collection

After requirements (+ fields when known), map each required item:

```text
Form / requirement field
  → verified profile?     → prefill
  → Answer Vault?         → prefill
  → generate from evidence? → draft for review
  → else                  → ask user (JOB_SPECIFIC collectionMode)
```

Also from match snapshot (soft):

```text
missingSkills[] → optional progressive prompts or draft cover-letter emphasis
```

Reuse existing readiness `collectionMode`: `ONBOARDING | PROGRESSIVE | JOB_SPECIFIC`.

Reusable answers may be offered for save to Answer Vault after confirm.

---

## Application package (shared by Assisted / Autopilot / Extension)

Produced after analysis + optional match + readiness (or partial for preview):

```json
{
  "selectedResumeId": "...",
  "match": {
    "status": "READY",
    "overallScore": 0.86,
    "displayScore": 86,
    "source": "RECOMMENDATIONS"
  },
  "selectedPortfolioProjects": [],
  "prefillFields": {},
  "draftAnswers": [],
  "submissionMode": "EXTERNAL_MANUAL",
  "provider": "ASHBY",
  "finalSubmissionRequiresUser": true
}
```

Browser extension (later) consumes this package: fill safe verified fields, highlight uncertain ones, **user** final-submits. Autopilot uses the same package shape; only the submission adapter differs.

---

## Caching / freshness

| Kind | Cache | Refresh |
| ---- | ----- | ------- |
| Skills, JD text, company | Longer | On ingest + stale Prepare |
| Job active, apply URL, form availability, channel | Shorter | Prepare Application + before submit |
| Form schema | Until browser/API inspect | On open apply page |

Always store `analyzedAt` / `expiresAt`. If page changed after approval → reanalyze before submit (`ANALYSIS_STALE`).

---

## Failure behavior (safe defaults)

| Failure | Behavior |
| ------- | -------- |
| Cannot fetch job page | Do not claim job-side eligibility; warn / information required |
| Cannot inspect form | `EXTERNAL_MANUAL` + `BROWSER_INSPECTION_REQUIRED` |
| CAPTCHA | Stop automation; user completes |
| Auth wall | Ask user to sign in on employer site; never collect credentials |
| Unknown required question | `INFORMATION_REQUIRED` |
| Page changed post-approval | Reanalyze before submit |

---

## Gradual implementation order

### Phase 0 — Fixture + contracts (this file)

- [x] Spec + Linear golden case below
- [x] Resume-match port design (stable snapshot + consent)
- [ ] Add `types/application-page-analysis.types.ts` (interfaces only)
- [ ] Add `types/application-match.types.ts` + `IApplicationMatchPort` contract
- [ ] Add empty repository contract + reason-code stubs (no scrape yet)

### Phase 1 — Job Page Analyzer MVP

1. Provider detection from apply URL (`jobs.ashbyhq.com` → `ASHBY`)
2. Fetch public job page / posting text; store snapshot
3. Rule + AI extraction for region, experience, sponsorship, portfolio (with `sourceText` + confidence)
4. Persist `ApplicationPageAnalysis` (`formStatus: NOT_INSPECTED`)
5. API: `POST /auto-apply/jobs/:jobId/analyze` (Prepare Application) and `GET .../analysis/latest`

### Phase 1b — Resume match port (parallel-safe)

1. Implement `IApplicationMatchPort` + `RecommendationsMatchAdapter` (wrap existing `JobRecommendation` / scoring entry — **no** engine imports in planner)
2. Consent gate via `RESUME_USAGE`
3. Stamp `JobApplication.matchScore` on READY
4. Wire `ensureMatch` into Prepare / plan refresh with `jobHints` from analysis when present
5. Keep readiness on `overallScore` only; ignore evolving component schemas

### Phase 2 — Readiness integration

1. `evaluate()` loads latest non-expired analysis for `jobId`
2. Apply confidence policy for `WORK_REGION`, experience, mobile evidence
3. Surface evidence in readiness `metadata` for FE
4. Progressive gaps using existing Answer Vault / profile fields + soft match gaps
5. FE: Prepare Application progress + “why this rule” evidence panel + match summary

### Phase 3 — Form Inspector (Ashby first)

1. Extension or authorized Ashby form definition when available
2. Normalize fields → `ExtractedApplicationField`
3. Update `formStatus`; keep submissionCapability honest

### Phase 4 — Application package builder

1. Map fields → profile / vault / resume
2. Embed `match` snapshot in shared package
3. Draft narrative answers with `requiresApproval: true`
4. Same package type for Assisted, Autopilot, Extension

### Phase 5 — Browser-assisted fill

1. Signed package contract (align with existing channel-detection comments on `BROWSER_ASSISTED`)
2. Prefill verified; highlight uncertain; user submits

### Phase 6 — Authorized submission adapters

1. Only with employer/partner credentials
2. Then channel detection may return `ATS_API` for allowlisted jobs

**MVP ship line (stop here first):** Phase 0–2 + 1b (analyze → match port → readiness) + package stub as EXTERNAL_MANUAL.  
**Out of MVP:** generic browser automation, Ashby write APIs, silent canonical job mutation, coupling to For You UI.

---

## UI flow (Prepare Application)

```text
Analyzing job requirements…
Detecting application provider…
Inspecting application questions…   (may say “deferred until you open the form”)
Comparing with your profile…
```

Summary card:

```text
Provider: Ashby
Mode: Assisted / External manual
Requirements: N | Form fields: ? | Ready: R | Needed: M | Warnings: W
[Review requirements] [Complete missing details]
```

Evidence drawer:

```text
Requirement: Based in North America
Source: “This role is available to candidates based in North America.”
Confidence: High
[Correct this requirement]
```

---

## Golden fixture: Linear Mobile Product Designer

**URL:** `https://jobs.ashbyhq.com/linear/eac7f181-d658-4943-9430-51bae2bcd110`  
**Provider:** ASHBY · **Channel today:** EXTERNAL_MANUAL (not authorized API)

### Normalized expectation (analysis output, not Job table)

```json
{
  "company": "Linear",
  "title": "Mobile Product Designer",
  "employmentType": "FULL_TIME",
  "workplaceType": "REMOTE",
  "eligibleRegion": "NORTH_AMERICA",
  "applicationProvider": "ASHBY",
  "submissionCapability": "EXTERNAL_MANUAL",
  "minimumExperienceYears": 5,
  "mobileExperienceRequired": true,
  "formStatus": "NOT_INSPECTED"
}
```

### Hard eligibility (must extract)

| Requirement | Gate |
| ----------- | ---- |
| Based in North America | Block if verified region outside; INFORMATION_REQUIRED if unknown |
| 5+ years designing software | Block below 5; ask if unknown |
| Mobile-specific design experience | Evidence or INFORMATION_REQUIRED |
| iOS + Android product design | Strong — require resume/portfolio evidence |
| Prototyping | Strong/hard — skill or portfolio |
| Written / async remote fit | Fit signal, not strict block |

**Critical test:** `isRemote: true` must **not** imply global eligibility.

### Expected readiness without verified applicant details

```json
{
  "decision": "INFORMATION_REQUIRED",
  "ready": false,
  "blockingReasons": [
    { "code": "WORK_REGION_VERIFICATION_REQUIRED", "field": "currentWorkRegion" },
    { "code": "MOBILE_DESIGN_EVIDENCE_REQUIRED", "field": "mobileDesignExperienceYears" },
    { "code": "PORTFOLIO_EVIDENCE_REQUIRED", "field": "portfolioProject" }
  ],
  "channel": "EXTERNAL_MANUAL",
  "provider": "ASHBY"
}
```

If user confirms region outside North America → `NOT_ELIGIBLE` / `JOB_LOCATION_REQUIREMENT_NOT_MET`.

### Progressive questions (job-specific)

1. Are you currently based in North America (US/Canada/Mexico/other eligible)?
2. Years designing software products?
3. Years of mobile product-design experience?
4. Shipped production for both iOS and Android?
5. Best portfolio project for mobile product work?
6. Prototyped interactions in code / Origami-equivalent?
7. Comfortable with occasional travel / off-sites?
8. Work authorization + sponsorship need (reuse baseline answers)

### Form inspection note

Ashby apply UI is JS-rendered. Backend job-page analysis must set `formStatus: NOT_INSPECTED` (or `BROWSER_REQUIRED`), never invent a complete field list from the JD alone.

### Suggested acceptance tests (when building)

1. Snapshot/fixture of Linear JD text → extracts `WORK_REGION=NORTH_AMERICA` with quoted evidence and high confidence  
2. Candidate region India + verified → `NOT_ELIGIBLE`  
3. Candidate region unknown → `INFORMATION_REQUIRED` (not READY)  
4. Provider ASHBY → channel remains `EXTERNAL_MANUAL`  
5. Analysis without form inspect → `formStatus !== COMPLETE`  
6. Low-confidence skill guess → warning only  

---

## Suggested file layout (when coding)

```text
backend/src/modules/auto-apply/
  types/application-page-analysis.types.ts
  types/application-match.types.ts
  contracts/application-page-analysis.contract.ts
  contracts/application-match.contract.ts          # IApplicationMatchPort
  adapters/recommendations-match.adapter.ts        # ONLY place that touches recommendations
  adapters/noop-match.adapter.ts
  services/job-posting-analyzer.service.ts
  services/prepare-application.service.ts          # orchestrates analyze → match → readiness
  services/application-form-inspector.service.ts   # later
  services/application-package.service.ts          # later
  repositories/prisma-application-page-analysis.repository.ts
  controllers/application-analysis.controller.ts
  routes/application-analysis.route.ts
  __fixtures__/linear-mobile-product-designer.jd.txt
  __tests__/job-posting-analyzer.linear.test.ts
  __tests__/application-match.port.test.ts         # facade + consent skips; mock adapter
```

---

## Non-goals (explicit)

- Do not call Ashby `applicationForm.submit` without authorized partner access  
- Do not start generic headless “apply for me” automation in MVP  
- Do not overwrite canonical job eligibility fields from unconfirmed AI  
- Do not treat physical IP/geo as verified work region — use user-verified profile/answer only  
- Do not import recommendation scoring engines or resume-analysis AI from planner/readiness  
- Do not require For You UI to run before Assisted Apply — `ensureMatch` is the on-demand path  

---

## Simplified Auto Apply setup (product)

Before Assisted Apply / tracking / approve:

1. Profile: multi-select roles, locations, workplace modes; salary currency (+ optional range or flexible); notice days or Immediate joiner  
2. At least one approved resume (with optional tags for resume selection)  
3. Consent: “Use my resume on applications” (`RESUME_USAGE`) with plain-language copy  

**Generate plan is removed from the UI** — `createPlan` runs automatically after track / Assisted Apply and when a submission row loads.

See FE: `setupCompleteness.ts`, Profile / Consents / Resume / Submissions tabs.

---

## One-line product outcome

Career Copilot will know not only whether the **candidate** is ready, but also what the **job and application** actually require — and, when the candidate allows, how well their **resume matches** those requirements — via one portable analyze → match → readiness → package pipeline for Assisted, Autopilot, and Extension apply.
