# Recommendation Skill Gap Contract

Recommendation DTOs include an additive `skillGap` object:

```json
{
  "exact": [],
  "alias": [],
  "related": [],
  "transferable": [],
  "missing": []
}
```

## Current Population

- `exact`: `scoreResult.matchedSkills`
- `related`: `scoreResult.relatedSkills`
- `missing`: `scoreResult.missingSkills` after removing any skill already covered
  by exact, alias, related, or transferable buckets
- `alias`: empty until skill alias canonicalization is implemented
- `transferable`: empty until skill graph relationships are implemented

The legacy arrays in `scoreResult` remain unchanged. `skillGap` is the stable UI
binding surface for future skill-gap panels.
