# Career Goal Frontend Contract

Ticket: `JRE-FE-005`

## Scope

The For You page exposes a dedicated Career tab at `/for-you?mode=career`.
The tab captures a career goal, persists it as an owned career target, generates
`CAREER_GOAL` recommendations from the created target id, and groups returned
jobs by recommendation category.

## Flow

1. User enters goal text in the Career tab.
2. Frontend posts `POST /api/v1/job-recommendations/career-targets`.
3. Frontend posts `POST /api/v1/job-recommendations` with:

```json
{
  "sourceType": "CAREER_GOAL",
  "sourceId": "<careerTargetId>"
}
```

4. Returned recommendations are grouped in this order when present:
   `BEST_MATCH`, `GOOD_MATCH`, `STRETCH_OPPORTUNITY`, `RELATED_CAREER_PATH`.

## UX States

- Empty: prompts for a career goal.
- Input validation: blocks blank goals and goals over 20,000 characters.
- Loading: disables the generate button while the create/generate mutation runs.
- Failure: renders the API error in an alert region.
- Success: renders grouped recommendation sections with the shared job card actions.

## Backend Addendum

This ticket adds the minimal owner-scoped career-target API required by the UI:

- `GET /api/v1/job-recommendations/career-targets`
- `POST /api/v1/job-recommendations/career-targets`
- `GET /api/v1/job-recommendations/career-targets/:careerTargetId`
- `DELETE /api/v1/job-recommendations/career-targets/:careerTargetId`

Missing, archived, and unowned targets return `404 RECOMMENDATION_SOURCE_NOT_FOUND`.
