# Skill Bucket Consistency Contract

Ticket: `JRE-SKILL-005`

## Scope

Recommendation skill arrays use one shared canonicalization and priority policy before classification, persistence, explanation, and `skillGap` mapping.

## Priority

When the same canonical skill appears in multiple buckets, the first bucket wins:

1. `matchedSkills`
2. `aliasSkills`
3. `relatedSkills`
4. `transferableSkills`
5. `missingSkills`

This prevents the UI from showing the same skill as both covered and missing, or as both exact and related.

## Normalization

All bucket labels are canonicalized with the same skill alias catalog used by scoring.

Examples:

- `typescript` -> `TypeScript`
- `NodeJS` -> `Node.js`
- `NextJS` -> `Next.js`

## Runtime Hooks

The normalizer runs:

- when the scoring engine builds `RecommendationScoreResult`
- when deterministic explanations expose skill arrays
- when `skillGap` maps arrays into exact/alias/related/transferable/missing buckets

## Current Limitations

The policy is skill-label based. It does not yet expose pair-level evidence like `Next.js covers React` as a structured DTO.
