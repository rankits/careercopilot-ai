# Skill Canonicalization Contract

Ticket: `JRE-SKILL-001`

## Scope

Recommendations canonicalize common skill aliases before required and preferred skill overlap scoring.

## Data Model

The database owns the long-term canonical skill catalog:

- `SkillCanonical`
  - `name`: display label, unique
  - `normalizedName`: normalized lookup key, unique
- `SkillAlias`
  - `canonicalId`: parent canonical skill
  - `alias`: display alias
  - `normalizedAlias`: normalized lookup key, unique

Aliases cascade-delete with their canonical skill. `normalizedAlias` is globally unique so one alias cannot point at multiple canonical skills.

## Normalization

Skill keys are normalized by:

1. trimming whitespace
2. lowercasing
3. removing characters outside `a-z`, `0-9`, `+`, and `#`

Examples:

- `Node.js` -> `nodejs`
- `Node JS` -> `nodejs`
- `Postgres` -> `postgres`

## Scoring Behavior

Required and preferred skill calculators compare canonicalized skills.

- Alias matches count as exact matches for overlap ratio purposes.
- Matched and missing skill output uses the canonical display label.
- Duplicate aliases collapse to a single canonical skill before scoring.
- Empty candidate or job skill arrays keep the existing neutral missing-component policy.

## Initial Seed

The curated seed includes high-frequency technology aliases for:

- Node.js
- PostgreSQL
- TypeScript
- JavaScript
- React
- Amazon Web Services

## Current Limitations

This ticket does not introduce related-skill or transferable-skill graph semantics. Those remain separate follow-up tickets.
