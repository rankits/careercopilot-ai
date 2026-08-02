# Refresh And Run API Contract

Base path: `/api/v1/job-recommendations`

All routes require Bearer auth, `USER` principal type, and the appropriate
`recommendations.*.own` permission.

## Refresh

`POST /refresh`

- Uses the same generation engine as `POST /`.
- Defaults an empty body to `{ "sourceType": "PROFILE" }`.
- Accepts the same PROFILE, RESUME, and JOB source body as generate.
- Is rate-limited as the practical refresh cooldown.
- On success, creates a new completed run and returns:
  - `run`: owned run metadata and lifecycle state
  - `items`: first page of recommendations for that run
  - `page`, `limit`, `total`: pagination fields

## Run Details

`GET /runs/:runId?page=1&limit=20`

- Returns one owned run plus paginated recommendations for that run.
- Missing and non-owned runs both return `404 RECOMMENDATION_RUN_NOT_FOUND`.
- Run metadata omits `userId`; ownership is enforced by repository lookup.

## List Filters

`GET /?latestOnly=true`

- Lists recommendations from the latest owned run only.
- If no run exists, returns an empty page.

`GET /?runId=<uuid>`

- Lists recommendations for one owned run.
- `runId` and `latestOnly=true` are mutually exclusive.

The existing `GET /` mixed-history list and `POST /` generate response remain
backward-compatible.
