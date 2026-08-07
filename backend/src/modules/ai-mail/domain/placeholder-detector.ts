const PLACEHOLDER_PATTERNS = [
  /\{\{[^{}]+\}\}/gu,
  /\$\{[^{}]+\}/gu,
  /\[(?:name|recruiter|company|role|job title|candidate|insert|placeholder|tbd)[^\]]*\]/giu,
  /<(?:name|recruiter|company|role|job-title|candidate|insert|placeholder|tbd)[^>]*>/giu,
  /\b(?:TBD|TODO|INSERT\s+(?:HERE|NAME|COMPANY|ROLE))\b/giu,
] as const;

export const findUnresolvedPlaceholders = (...values: Array<string | undefined>): string[] => {
  const found = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    for (const pattern of PLACEHOLDER_PATTERNS) {
      for (const match of value.matchAll(pattern)) found.add(match[0]);
    }
  }
  return [...found];
};

export const hasUnresolvedPlaceholders = (...values: Array<string | undefined>): boolean =>
  findUnresolvedPlaceholders(...values).length > 0;
