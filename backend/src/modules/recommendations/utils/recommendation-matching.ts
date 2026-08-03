const normalizeToken = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/\s+/g, ' ');

export const tokenize = (value: string): string[] =>
  normalizeToken(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

export const normalizeList = (values: readonly string[]): string[] =>
  values.map(normalizeToken).filter(Boolean);

export const listOverlapRatio = (
  required: readonly string[],
  available: readonly string[],
): { ratio: number; matched: string[]; missing: string[] } => {
  const requiredNormalized = normalizeList(required);
  if (requiredNormalized.length === 0) {
    return { ratio: 1, matched: [], missing: [] };
  }
  const availableSet = new Set(normalizeList(available));
  const matched = requiredNormalized.filter((value) => availableSet.has(value));
  const missing = requiredNormalized.filter((value) => !availableSet.has(value));
  return {
    ratio: matched.length / requiredNormalized.length,
    matched,
    missing,
  };
};

export const textOverlapRatio = (left: string, right: string): number => {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }
  return overlap / leftTokens.size;
};

export const clampScore = (score: number): number => {
  if (!Number.isFinite(score)) return 0;
  if (score < 0) return 0;
  if (score > 1) return 1;
  return score;
};
