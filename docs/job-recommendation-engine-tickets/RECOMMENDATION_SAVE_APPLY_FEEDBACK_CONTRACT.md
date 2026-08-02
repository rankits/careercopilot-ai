# Recommendation Save and Apply Feedback Contract

Ticket: `JRE-FEEDBACK-002`

## Scope

Recommendation cards that represent persisted recommendations must link user save/apply actions back to the existing recommendation feedback endpoint without changing the public API contract.

## Behavior

- Rendering and opening feedback remains unchanged from `JRE-FEEDBACK-001`.
- Saving a recommendation-backed card persists the application save first, then upserts `SAVED` feedback for that `recommendationId`.
- Unsaving a job does not create recommendation feedback.
- Applying from a recommendation-backed card opens a validated apply URL. If the open succeeds, the page upserts `APPLIED` feedback for that `recommendationId`.
- Cards without a `recommendationId` do not submit recommendation feedback.

## Retrieval Exclusion

`APPLIED` remains part of `RETRIEVAL_EXCLUSION_FEEDBACK_ACTIONS`. The next recommendation generation merges applied job IDs from feedback into `excludeJobIds` passed to retrieval, so successfully applied jobs are not returned again by compliant retrieval providers.

## Observability

- `feedbackActionTotal.APPLIED` counts all APPLIED feedback writes.
- `feedbackAppliedLinkedTotal` is the in-process counter backing the `feedback_applied_linked_total` metric expectation for save/apply linking.

