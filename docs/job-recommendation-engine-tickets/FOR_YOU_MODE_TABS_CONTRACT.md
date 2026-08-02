# For You Mode Tabs Contract

Ticket: `JRE-FE-001`

## Navigation

- `/for-you` opens the Profile recommendation mode.
- `/for-you?mode=profile` is treated as Profile and can normalize back to `/for-you` when selected.
- `/for-you?mode=resume`, `/for-you?mode=similar`, `/for-you?mode=text-career`, and `/for-you?mode=saved` open their matching mode panels.
- Unknown `mode` values fall back to Profile.

## Accessibility

- The mode selector uses `role="tablist"`.
- Each mode control uses `role="tab"` with `aria-selected`.
- Each active content area uses `role="tabpanel"` linked to the active tab by `aria-labelledby`.

## Fetching

- Profile remains the only fully wired mode in this ticket.
- Profile recommendations and saved-job state fetch only when Profile is the active mode.
- Unwired modes render placeholders and do not generate or list Profile recommendations.
- Recommendation generation remains explicit through the existing Profile buttons.

## Score Display

- Profile cards continue to render the backend-provided `displayScore` through the recommendation card mapping path.
- The UI must not invent placeholder match percentages for unwired modes.
