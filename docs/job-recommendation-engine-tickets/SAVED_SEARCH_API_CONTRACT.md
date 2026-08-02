# Saved Search API Contract

Ticket: `JRE-API-005`

## Scope

`SavedSearch` management is exposed under the authenticated recommendation API:

- `GET /api/v1/job-recommendations/saved-searches`
- `POST /api/v1/job-recommendations/saved-searches`
- `GET /api/v1/job-recommendations/saved-searches/:savedSearchId`
- `PATCH /api/v1/job-recommendations/saved-searches/:savedSearchId`
- `DELETE /api/v1/job-recommendations/saved-searches/:savedSearchId`
- `POST /api/v1/job-recommendations/saved-searches/:savedSearchId/generate`

All routes require a bearer token for a `USER` principal. Read operations require
`recommendations.read.own`, create and generate require `recommendations.create.own`,
and update/delete require `recommendations.update.own`.

## Ownership

Every persisted saved-search operation is scoped to `String(req.user.principalId)`.
Missing, deleted, and non-owned rows all return the same 404 response:

```json
{
  "status": "error",
  "message": "Saved search was not found",
  "code": "RECOMMENDATION_SOURCE_NOT_FOUND"
}
```

This keeps IDOR behavior non-enumerable.

## Payloads

Create accepts `name`, optional `query`, required/defaulted `filters`, and optional
`context`. Update accepts a non-empty partial of those fields. List uses the shared
`page` and `limit` pagination contract with deterministic `updatedAt desc, id asc`
ordering.

Generate is a route-level shortcut for:

```json
{
  "sourceType": "SAVED_SEARCH",
  "sourceId": "<savedSearchId>"
}
```

Optional request `filters` are forwarded to recommendation generation as runtime
overrides. Saved-search source authorization remains in the recommendation
generation boundary and uses the existing owner-scoped source loader.

## Observability

Each service-level saved-search API operation increments `savedSearchApiTotal` in
the recommendation metrics snapshot. The generate shortcut continues to use the
existing recommendation generation metrics.
