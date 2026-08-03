import { describe, expect, it } from 'vitest';

/**
 * Mirrors extract/repair helpers from resume-analysis-ai.client.ts
 * so we can unit-test truncation recovery without spinning up providers.
 */
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
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
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
  return text.slice(start);
};

const tryRepairJson = (raw: string): string => {
  let text = extractJsonObject(raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
  if (!text) return text;
  try {
    JSON.parse(text);
    return text;
  } catch {
    let repaired = text;
    const quoteCount = (repaired.match(/"/g) || []).length;
    if (quoteCount % 2 === 1) repaired += '"';
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

describe('resume analysis JSON repair', () => {
  it('extracts JSON from preamble text', () => {
    const raw = 'Here you go:\n{"atsScore":70,"strengths":["Clear"]}\nThanks';
    expect(JSON.parse(extractJsonObject(raw))).toEqual({
      atsScore: 70,
      strengths: ['Clear'],
    });
  });

  it('repairs truncated objects with open braces/strings', () => {
    const truncated = '{"atsScore":70,"strengths":["Clear","Strong AP';
    const repaired = tryRepairJson(truncated);
    expect(() => JSON.parse(repaired)).not.toThrow();
    expect(JSON.parse(repaired).atsScore).toBe(70);
  });

  it('rejects safety-only non-json text via extract', () => {
    expect(extractJsonObject('User Safety: safe')).toBe('User Safety: safe');
  });
});
