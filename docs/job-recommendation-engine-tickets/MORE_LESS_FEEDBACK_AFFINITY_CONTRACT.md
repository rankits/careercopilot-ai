# More/Less Feedback Affinity Contract

Ticket: `JRE-FEEDBACK-003`

## Scope

Recommendation cards expose explicit `MORE_LIKE_THIS` and `LESS_LIKE_THIS` feedback controls without changing the public feedback API.

## Frontend Behavior

- Recommendation-backed cards show accessible `More like this` and `Less like this` actions.
- `MORE_LIKE_THIS` keeps the card visible, marks the action selected, and shows a success notice.
- `LESS_LIKE_THIS` submits feedback and hides the card optimistically.
- Failed feedback writes roll back the local card state.
- Cards without a persisted `recommendationId` do not show More/Less feedback controls.

## Backend Behavior

- `LESS_LIKE_THIS` remains in `RETRIEVAL_EXCLUSION_FEEDBACK_ACTIONS`; future generation passes those job IDs to retrieval as exclusions.
- `MORE_LIKE_THIS` feedback is loaded from the user's most recent bounded feedback anchors.
- Candidate jobs receive a deterministic capped affinity boost when they are similar to a MORE anchor by skills, title tokens, or company.
- Exact anchor jobs are not boosted as their own similar neighbor.
- Boost evidence is appended to recommendation score reasons with `moreLikeThisAnchorJobId`, `moreLikeThisSimilarity`, and `moreLikeThisBoost`.

## Observability

- `feedbackMoreLessTotal` backs the `feedback_more_less_total` expectation.
- `feedbackActionTotal.MORE_LIKE_THIS` and `feedbackActionTotal.LESS_LIKE_THIS` continue to expose per-action counts.

