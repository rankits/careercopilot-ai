# Recommendation Feedback Telemetry Contract

Ticket: `JRE-FEEDBACK-001`

## Scope

Recommendation cards send silent telemetry through the existing feedback API:

- `VIEWED`: sent once per recommendation id when a card is rendered in For You.
- `OPENED`: sent once per recommendation id when a user opens the job detail from
  a recommendation card.

The endpoint remains:

```http
POST /api/v1/job-recommendations/:recommendationId/feedback
```

with `{ "action": "VIEWED" }` or `{ "action": "OPENED" }`.

## Client Behavior

The For You page keeps an in-memory `action:recommendationId` set to debounce
telemetry during the current page session. Failed telemetry calls are removed
from that set so a later render/open can retry.

`VIEWED` and `OPENED` do not invalidate recommendation list queries. Explicit
preference actions such as `DISMISSED` and `NOT_RELEVANT` keep the existing
invalidation behavior.

## Server Behavior

The existing owner-scoped feedback upsert persists these actions. Repeated
events for the same user and recommendation update the single feedback row,
preserving the non-enumerable 404 behavior for missing or unowned
recommendations.

## Observability

The recommendation metrics snapshot includes:

```json
{
  "feedbackActionTotal": {
    "VIEWED": 0,
    "OPENED": 0
  }
}
```

Counts increment at the feedback service boundary for every accepted action.
