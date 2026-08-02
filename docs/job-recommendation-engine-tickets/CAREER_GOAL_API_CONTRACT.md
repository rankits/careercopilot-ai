# Career Goal Recommendation API Contract

Ticket: `JRE-API-004`

## Endpoint

`POST /api/v1/job-recommendations`

Request:

```json
{
  "sourceType": "CAREER_GOAL",
  "sourceId": "33333333-3333-3333-3333-333333333333"
}
```

## Authorization

- Authentication: bearer token
- Principal: `USER`
- Permission: `recommendations.create.own`
- `sourceId` is required for `CAREER_GOAL`
- missing, archived, and unowned career targets return `404 RECOMMENDATION_SOURCE_NOT_FOUND`

## Response

The endpoint returns the existing recommendation array success envelope. The
shape is unchanged from other source-based generation calls.

## Observability

CAREER_GOAL generate requests increment `careerGoalApiTotal` in the
recommendation metrics snapshot, corresponding to `career_goal_api_total`.

## Swagger

Swagger documents `CAREER_GOAL` in the source generation `sourceType` enum and
preserves the source id requirement text.

## Verification

- API tests cover authenticated CAREER_GOAL forwarding.
- API tests cover 404 behavior for missing/unowned CAREER_GOAL sources.
- Swagger tests cover `CAREER_GOAL` source enum presence.
- Service tests cover metric increment and owned career-goal generation.
