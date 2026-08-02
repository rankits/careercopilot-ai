# Recommendation Filter Mode Contract

Ticket: `JRE-FILTER-002`

## API Contract

`filters.filterMode` is optional on recommendation generation and refresh requests.

- `STRICT` is the default.
- `FLEXIBLE` keeps negotiable near-misses so they can be scored and labeled.
- Values outside `STRICT` or `FLEXIBLE` fail request validation.

## Strict Mode

Strict mode enforces deterministic eligibility before scoring:

- employment type must match when requested
- location tokens must match when requested
- remote preference must match when requested, except `ANY`
- salary minimum must be met when requested
- salary maximum must not be exceeded when requested
- salary currency must match when both sides disclose a currency
- required job certifications must be present on the candidate context when the job discloses them
- disclosed work-authorization and sponsorship constraints must be satisfied when both sides provide enough signal
- excluded companies are always removed

Undisclosed salary does not satisfy a strict minimum.

## Flexible Mode

Flexible mode softens negotiable filters:

- employment type, location, remote preference, and salary misses are retained
- vector retrieval does not pre-filter by negotiable salary, currency, or remote constraints
- excluded companies and explicit excluded job ids remain hard exclusions
- scored jobs that violate negotiable preferences are capped at `STRETCH_OPPORTUNITY`
- explanations include a flexible-mode reason with the violated preference labels

## Compatibility

Requests without `filterMode` continue to behave as strict filtering. The existing
`includeStretchOpportunities=false` option still removes stretch and related
categories after scoring.

## Verification

- Unit filters cover strict salary-floor exclusion and flexible near-miss retention.
- PGVECTOR retrieval tests cover strict metadata filters and flexible broadening.
- Generation tests cover request mode propagation and stretch labeling.
- Schema tests cover valid and invalid `filterMode` values.
