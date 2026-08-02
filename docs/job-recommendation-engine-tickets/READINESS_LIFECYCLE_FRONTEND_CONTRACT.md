# Readiness Lifecycle Frontend Contract

Ticket: `JRE-UI-002`

## Lifecycle Mapping

- `NOT_STARTED` with an empty latest-run list shows the first-run generate CTA.
- `QUEUED` shows a live status message and a status-refresh CTA.
- `PROCESSING` shows a live status message and a status-refresh CTA.
- `READY` shows the latest recommendation list when results are present.
- `STALE` shows a live stale banner and a refresh CTA.
- `FAILED`, `FAILED_TIMEOUT`, `FAILED_PROVIDER`, and `FAILED_EMPTY` show an alert with the lifecycle code and a retry CTA.

## Actions

- First-run generation uses the profile generation action.
- Stale refresh, list refresh, and failed-run retry use `POST /job-recommendations/refresh`.
- Processing states do not expose a generate CTA.
- Failed states do not fall back to fabricated jobs or a generic empty-results prompt.

## Accessibility

- Stale, queued, and processing lifecycle messages use live status semantics.
- Failed lifecycle messages use alert semantics.
- Retry and refresh controls are real buttons and are disabled while a profile generation or refresh mutation is pending.

## Verification

- `ForYouPage` tests cover stale refresh, processing status refresh, and failed lifecycle retry with code display.
- Frontend typecheck and touched-file lint pass.
