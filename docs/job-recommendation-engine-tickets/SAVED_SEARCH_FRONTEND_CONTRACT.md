# Saved Search Frontend Contract

Ticket: `JRE-FE-006`

## Scope

The For You page exposes the Saved tab at `/for-you?mode=saved`. Users can
create a saved search, select an owned saved search, rerun recommendation
generation, delete a saved search, and view rerun results.

## Flow

- List: `GET /api/v1/job-recommendations/saved-searches`
- Create: `POST /api/v1/job-recommendations/saved-searches`
- Rerun: `POST /api/v1/job-recommendations/saved-searches/:savedSearchId/generate`
- Delete: `DELETE /api/v1/job-recommendations/saved-searches/:savedSearchId`

The UI never accepts arbitrary owner ids; all calls depend on the authenticated
backend principal.

## UX States

- Empty: shows "No saved searches yet."
- Loading: shows a saved-search loading indicator.
- Failure: renders the API error in an alert region.
- Create/delete success: renders a dismissible status alert.
- Success: renders rerun recommendations using the shared recommendation card
  actions.

Filter editing remains intentionally minimal in this ticket: created saved
searches persist user-entered name/query with an empty filter object. Rich filter
builder controls can be added later without changing the rerun contract.
