# Candidate Profile Mapping Contract

Ticket: `JRE-DATA-001`

## Stored Source

`CandidateProfile` remains read-only for recommendation mapping. No schema changes are required:

- `personalDetails` is the free-form JSON source for manually edited profile fields.
- `skills`, `experience`, `education`, and `certifications` are structured JSON columns.
- Resume-derived optional fields can flow through the same mapper when present.

## Mapped Fields

The PROFILE mapper reads available fields into `CandidateProfileSourcePayload`:

- Titles: `currentTitle`, `designation`, `primaryRole`, `title`, professional profile roles, and structured experience titles.
- Skills: profile `skills` as required skills; preferred/target skills and `TECH_STACK` labels as preferred skills.
- Roles and industries: preferred role fields and `ROLE`/`SPECIALISATION` labels as related titles; preferred industries and `DOMAIN` labels as industries.
- Location and work mode: structured/string location, preferred locations, remote preference, and employment types.
- Compensation: `salaryExpectation`, `expectedSalary`, salary min/max, currency, and non-negotiable minimum.
- Qualifications: education descriptions and certification names/raw/description values.
- Exclusions and eligibility: excluded companies, excluded skills, eligible countries, work authorization, sponsorship, and languages.
- Text: summary/professional summary/profile summary/headline plus project names/descriptions.

## Missing Fields

The mapper does not invent unavailable values. Missing optional fields remain `undefined` or empty arrays so readiness and scoring can apply their neutral/missing-data policies.

## Compatibility

Manual profile editor fields such as `designation` and `totalExperience` are accepted. Comma, semicolon, and newline-separated strings are normalized for optional list fields.
