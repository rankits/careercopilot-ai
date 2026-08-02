# Mobile And Zoom Usability Contract

Gap: `JRE-UI-005`

`JRE-UI-005` is tracked in the gap matrix and QA traceability matrix, but no standalone generated ticket file exists in `docs/job-recommendation-engine-tickets/tickets`.

## Recommendation Cards

- At narrow widths, cards collapse to one content column plus the accent rail.
- Company logo, job details, actions, and explanation details stay in the content column.
- Job metadata wraps with row and column gaps instead of forcing horizontal overflow.
- Action controls use responsive grid tracks so labels can wrap without overlapping neighboring controls.

## Recommendation Lists

- Virtualized lists keep an internal scroll container so offscreen rows remain reachable through the virtualizer.
- Mobile list height uses viewport-relative sizing instead of a fixed desktop offset.
- List/listitem semantics from `JRE-UI-004` remain intact.

## Manual Checklist

- At 320px CSS width, job title, company/location, score, actions, and details do not overlap.
- At 200% browser zoom, card action labels remain readable and keyboard reachable.
- For You tabs remain horizontally scrollable and arrow-key navigable.
- Virtualized results remain scrollable on mobile and do not trap focus.

## Verification

- Focused JobCard, VirtualizedJobList, and ForYouPage tests pass after responsive changes.
- Frontend typecheck and touched-file lint pass.
