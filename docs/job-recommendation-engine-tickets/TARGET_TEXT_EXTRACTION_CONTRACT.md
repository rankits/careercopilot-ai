# Target Text Extraction Contract

Ticket: `JRE-CONTEXT-002`

## Provider

- `TargetTextSourceStrategy` accepts a `RecommendationExtractionProvider`.
- The default provider is deterministic heuristic extraction.
- If a supplied provider throws, the strategy falls back to the heuristic provider.

## Extracted Signals

The heuristic extractor maps common free-text signals into `ExtractedRecommendationContext`:

- Job titles: backend, frontend, full-stack, platform, DevOps, data, product, and management roles.
- Skills: common languages, frameworks, databases, cloud platforms, infrastructure, API, and ML terms.
- Work mode: remote, hybrid, or onsite.
- Employment type: full-time, part-time, contract, or internship.
- Salary hints: minimum/maximum phrases with USD/INR detection.
- Industries: fintech/payments, healthcare, ecommerce, SaaS, and education.
- Source text: normalized original text with control characters removed.

## Fallback Policy

Extraction never invents jobs. Missing signals remain empty or undefined and scoring/retrieval apply
their normal missing-data policies. Skill-only backend/frontend hints can supply a broad target title
when the text does not explicitly name a role.

## API Behavior

`POST /job-recommendations/from-text` continues to return the existing recommendation array. The
structured context is used internally for retrieval and scoring; no response shape change is required
in this ticket.
