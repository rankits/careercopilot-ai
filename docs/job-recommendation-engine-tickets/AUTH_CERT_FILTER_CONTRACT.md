# Recommendation Authorization And Certification Filter Contract

Ticket: `JRE-FILTER-003`

## Optional Job Metadata

Recommendation filters may use `JobListDto.recommendationEligibility` when a
job source provides it.

- `requiredCertifications`
- `eligibleCountries`
- `sponsorshipOffered`
- `requiresWorkAuthorization`

Current persisted job providers do not populate these fields. Missing job
eligibility metadata is treated as unknown and does not exclude the job.

## Strict Mode

In `STRICT` mode:

- a job with required certifications is excluded unless the candidate context
  contains every required certification by normalized exact name
- a job with disclosed eligible countries is excluded only when the candidate
  context also has disclosed countries and none overlap
- a candidate who needs sponsorship is excluded from jobs that explicitly do not
  offer sponsorship
- a job that explicitly requires work authorization excludes candidates with
  `UNKNOWN` authorization

## Flexible Mode

In `FLEXIBLE` mode, authorization and certification misses are retained as
stretch opportunities. Excluded companies and explicit excluded job ids remain
hard exclusions.

## Privacy

Authorization and sponsorship status are not added to user-facing explanation
copy. Flexible-mode explanations expose only generic filter-violation labels.

## Observability

Strict certification exclusions increment `filterCertExcludeTotal` in the
recommendation metrics snapshot, corresponding to the `filter_cert_exclude_total`
requirement.

## Verification

- Unit tests cover certification exclusion, sparse metadata skip behavior,
  sponsorship exclusion, and flexible retention.
- Backend typecheck validates the additive DTO metadata contract.
