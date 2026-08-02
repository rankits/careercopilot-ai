# Skill Relationship Contract

Ticket: `JRE-SKILL-002`

## Scope

Recommendations use a curated skill relationship graph after alias canonicalization.

The graph supports:

- `RELATED`: adjacent skills that provide partial match credit
- `TRANSFERABLE`: broader skills that provide lower partial match credit

Related and transferable matches never populate the exact skill bucket.

## Data Model

`SkillRelationship` stores directed canonical-skill edges:

- `fromSkillId`
- `toSkillId`
- `type`: `RELATED` or `TRANSFERABLE`

The tuple `(fromSkillId, toSkillId, type)` is unique. Both sides cascade-delete with their canonical skills.

Recommendation rows also store `transferableSkills` so generated and persisted responses expose the same skill-gap buckets.

## Scoring Policy

Skill overlap is evaluated in this order for each requested skill:

1. exact/canonical alias hit: `1.0`
2. related edge hit: `0.65`
3. transferable edge hit: `0.35`
4. no hit: missing

Exact matches win over relationship matches. Related matches win over transferable matches.

## Runtime Behavior

The runtime graph is cached in process from the curated relationship catalog. The seed uses the same catalog to upsert database rows.

The first curated subset includes relationships for:

- Node.js and Express
- React and Next.js
- PostgreSQL and MySQL
- TypeScript and JavaScript
- Amazon Web Services and Google Cloud Platform

## Explanation Behavior

Relationship hits are included in score reason evidence:

- `related: <available> covers <requested>`
- `transferable: <available> covers <requested>`

Structured `skillGap` output maps exact, related, transferable, and missing skills into separate buckets.

## Current Limitations

The graph is curated only. ML-inferred relationships, admin editing, and richer pair-level API evidence remain out of scope.
