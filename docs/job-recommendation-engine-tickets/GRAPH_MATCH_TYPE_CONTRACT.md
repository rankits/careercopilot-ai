# Graph Match Type Contract

Ticket: `JRE-SKILL-003`

## Scope

Recommendation match types are derived from canonical skill buckets before falling back to score thresholds.

## Skill Buckets

The scorer now emits separate arrays for:

- `matchedSkills`: exact canonical matches
- `aliasSkills`: canonical alias matches with full skill credit
- `relatedSkills`: graph-related partial matches
- `transferableSkills`: graph-transferable lower-credit matches
- `missingSkills`: requested skills with no exact, alias, related, or transferable coverage

These arrays are persisted on recommendation rows and exposed through `scoreResult`, explanation DTOs, and `skillGap`.

## Classification Order

The default classifier uses graph buckets first:

1. any transferable coverage -> `TRANSFERABLE`
2. any related coverage -> `RELATED`
3. exact or alias coverage plus missing skills -> `RELATED`
4. alias-only coverage -> `ALIAS`
5. exact-only coverage -> `EXACT`
6. missing-only coverage -> `MISSING`
7. no skill evidence -> legacy score-threshold fallback

This prevents related, transferable, or missing-only skill evidence from being labeled as exact because of a high overall score.

## Current Limitations

The classifier consumes the in-process curated graph. Database-backed graph refresh and richer pair-level evidence remain future improvements.
