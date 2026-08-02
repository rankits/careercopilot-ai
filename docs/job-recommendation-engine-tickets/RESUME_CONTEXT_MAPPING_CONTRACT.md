# Resume Context Mapping Contract

Ticket: `JRE-DATA-002`

## Lookup Semantics

RESUME recommendation generation distinguishes source states:

- Missing or unowned resume: `404 RECOMMENDATION_SOURCE_NOT_FOUND`.
- Owned resume with no completed parse, no parse run, or unusable parse JSON:
  `422 RECOMMENDATION_CONTEXT_INVALID`.
- Owned resume with completed parse data but no title, skill, or source-text signal:
  `422 RECOMMENDATION_CONTEXT_INVALID`.

`COMPLETED` and `NEEDS_REVIEW` parse statuses are eligible for recommendation mapping.

## Supported Parse Shapes

The loader maps both legacy `ParsedResumeData` and canonical resume-shaped JSON:

- `personalDetails` or canonical `personalInformation`, `currentPosition`, and `professionalSummary`.
- `experience` or canonical `employmentHistory`.
- Array `skills` or canonical grouped skills: `technical`, `tools`, `frameworks`, `softSkills`, and `domains`.
- `professionalProfile`, `professionalLabels`, `education`, `certifications`, `languages`, and total experience fields.

## Context Parity

RESUME source payloads pass through the same `toCandidateProfileSourcePayload` mapper as PROFILE.
This keeps title, skill, location, seniority, education, certification, language, domain, and source
text behavior aligned across both sources.
