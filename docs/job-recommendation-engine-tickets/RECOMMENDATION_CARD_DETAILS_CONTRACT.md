# Recommendation Card Details Contract

Ticket: `JRE-UI-001`

## Data Mapping

- Recommendation cards consume `displayScore` exactly as provided by the API.
- Explanation bullet scores remain normalized component scores and are formatted once for display.
- Cards do not invent explanation bullets, skill gaps, or score values when the API omits them.
- Skill gaps are mapped from the recommendation DTO into distinct UI buckets:
  - `exact`
  - `alias`
  - `related`
  - `transferable`
  - `missing`

## Card Behavior

- Cards with explanation bullets or skill gaps render a `Details` action.
- Expanding details shows the explanation summary when present.
- The details panel shows the top component reasons and supporting evidence.
- Skill buckets are rendered only when they contain at least one skill.
- Missing skills render separately from related, transferable, alias, and exact matches.

## Accessibility

- The `Details` action is a real button inside the card action row.
- The button exposes `aria-expanded`.
- The button exposes `aria-controls` when it controls an expanded details region.
- The expanded details region is addressable by the controlled `id`.
- Toggling details does not trigger the card navigation handler.

## Verification

- Component tests cover expanding details, score formatting, and distinct missing/related skill rendering.
- Frontend typecheck and touched-file lint pass.
