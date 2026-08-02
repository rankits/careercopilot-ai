# Deterministic Explanation Contract

Recommendation list/detail items include an additive `explanation` object.

Existing `scoreResult.reasons` remains unchanged for backward compatibility and
debugging.

## Source Of Truth

Explanations are derived from persisted score data:

- `scoreResult.components`
- component weights
- component `reasons`
- matched, related, and missing skill arrays
- hybrid score evidence recorded during scoring

No LLM prose is generated in this ticket.

## Response Shape

`explanation` contains:

- `summary`: short deterministic summary using `displayScore` and matched skill count
- `bullets`: up to three component bullets ordered by weighted contribution
- `matchedSkills`, `relatedSkills`, `missingSkills`: copied from score result
- `scoreModel`: overall score, display score, heuristic/retrieval weights, and available source scores

Hybrid score bookkeeping is exposed in `scoreModel`, not as a fake component
bullet. Component bullets are emitted only when a component reason exists.
