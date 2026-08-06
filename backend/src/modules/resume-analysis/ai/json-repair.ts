const extractJson = (raw: unknown): string => {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.map((p) => (typeof p === 'string' ? p : '')).join('');
  return '';
};

/** Extract the first JSON object from model output (ignore preambles / safety text). */
const extractJsonObject = (raw: string): string => {
  const text = raw.trim();
  if (!text) return text;
  if (text.startsWith('{') && text.endsWith('}')) return text;

  const start = text.indexOf('{');
  if (start < 0) return text;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]!;
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  // Truncated object — return from first brace so repair can close it.
  return text.slice(start);
};

/** Best-effort repair when the model truncates JSON mid-string. */
const tryRepairJson = (raw: string): string => {
  let text = extractJsonObject(
    raw
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim(),
  );
  if (!text) return text;
  try {
    JSON.parse(text);
    return text;
  } catch {
    let repaired = text;
    const quoteCount = (repaired.match(/"/g) || []).length;
    if (quoteCount % 2 === 1) repaired += '"';
    // Close dangling escapes / incomplete unicode sequences.
    repaired = repaired.replace(/\\$/, '');
    repaired = repaired.replace(/,\s*$/g, '');
    for (let i = 0; i < 32; i += 1) {
      try {
        JSON.parse(repaired);
        return repaired;
      } catch {
        const lastOpenObj = repaired.lastIndexOf('{');
        const lastOpenArr = repaired.lastIndexOf('[');
        const lastCloseObj = repaired.lastIndexOf('}');
        const lastCloseArr = repaired.lastIndexOf(']');
        if (lastOpenArr > lastCloseArr && lastOpenArr >= lastOpenObj) {
          repaired += ']';
        } else if (lastOpenObj > lastCloseObj) {
          repaired += '}';
        } else {
          repaired = repaired.replace(/,\s*([}\]])/g, '$1');
          try {
            JSON.parse(repaired);
            return repaired;
          } catch {
            // Truncated mid-value: drop the last incomplete property.
            const cut = Math.max(
              repaired.lastIndexOf(','),
              repaired.lastIndexOf('{'),
              repaired.lastIndexOf('['),
            );
            if (cut > 0 && cut < repaired.length - 1) {
              repaired = repaired.slice(0, cut);
              const q = (repaired.match(/"/g) || []).length;
              if (q % 2 === 1) repaired += '"';
              continue;
            }
            break;
          }
        }
      }
    }
    return text;
  }
};

const isNonJsonModelOutput = (raw: string): boolean => {
  const text = raw.trim();
  if (!text) return true;
  if (/^user safety:/i.test(text)) return true;
  if (!text.includes('{')) return true;
  return false;
};

export { extractJson, extractJsonObject, tryRepairJson, isNonJsonModelOutput };
