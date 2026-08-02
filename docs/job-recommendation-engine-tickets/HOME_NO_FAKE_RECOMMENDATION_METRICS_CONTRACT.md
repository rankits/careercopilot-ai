# Home No Fake Recommendation Metrics Contract

Ticket: `JRE-UI-003`

## Home Dashboard

- Home must not render hardcoded recommendation, match, or resume-analysis scores.
- Home may show static dashboard counters only when they are not presented as recommendation quality metrics.
- Recommendation readiness copy can point users to For You, but it must not imply a score that was not returned by the backend.

## Removed Risk

- `ResumeScoreCard score={92}` is not rendered on Home.
- The Home recommendations panel remains an empty/readiness CTA until live recommendation aggregates are wired.

## Verification

- Home tests assert that the old `Resume Score` card is absent.
- Home tests assert that no `90%` through `99%` fabricated score text appears when rendered without live aggregates.
- Frontend typecheck and touched-file lint pass.
