# Recommendation Run Ownership Invariant

`RecommendationRun.userId`, `JobRecommendation.userId`, and
`RecommendationFeedback.userId` store `String(req.user.principalId)` for `USER`
JWT principals.

They do not store request headers, query/body `userId` values, or historical
public user identifiers.

## Enforcement

- Recommendation controllers derive the caller id from `req.user.principalId`
  after auth, principal-type, and permission middleware.
- Generation APIs pass that principal id to source authorization and then to
  recommendation orchestration.
- Orchestration rejects any authorized context whose `userId` differs from the
  authenticated principal before creating a run.
- Persistence is asserted after recommendation creation so returned records must
  match the run id and principal-scoped user id.
- Feedback creation first loads the recommendation through the same owning user
  scope, then persists feedback under that principal id.

## Regression Coverage

- API tests prove spoofed `x-user-id` and query `userId` values do not replace
  `String(req.user.principalId)`.
- Generation tests prove run, recommendation, and feedback rows share the same
  principal-scoped user id.
- IDOR tests prove run, recommendation, feedback, list, and exclusion repository
  reads/writes are scoped by owning user id.
