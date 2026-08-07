export type JsonObject = Record<string, unknown>;

export const asObject = (value: unknown): JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {};

export const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const cleanText = (value: unknown, max = 1000): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? cleaned.slice(0, max) : undefined;
};

export const firstText = (
  object: JsonObject,
  aliases: readonly string[],
  max?: number,
): string | undefined => {
  for (const alias of aliases) {
    const value = cleanText(object[alias], max);
    if (value) return value;
  }
  return undefined;
};

export const textArray = (value: unknown, limit: number, max = 1000): string[] => {
  const source =
    typeof value === 'string'
      ? value.split(/\r?\n|[;•]/)
      : asArray(value).flatMap((item) => {
          if (typeof item === 'string') return [item];
          const object = asObject(item);
          return [object.text, object.description, object.name, object.value];
        });
  const unique = new Map<string, string>();
  for (const item of source) {
    const cleaned = cleanText(item, max);
    if (cleaned) unique.set(cleaned.toLocaleLowerCase(), cleaned);
    if (unique.size === limit) break;
  }
  return [...unique.values()];
};

export const httpUrl = (value: unknown): string | undefined => {
  const text = cleanText(value, 2048);
  if (!text) return undefined;
  try {
    const url = new URL(text);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
};

export const stableUnique = (values: readonly (string | undefined)[]): string[] => {
  const unique = new Map<string, string>();
  for (const value of values) {
    if (value) unique.set(value.toLocaleLowerCase(), value);
  }
  return [...unique.values()];
};
