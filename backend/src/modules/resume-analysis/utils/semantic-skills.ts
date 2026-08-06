/**
 * Light skill-label cleanup for AI semantic ATS output.
 * Does NOT reject non-catalog skills (chip parser is not the ATS source of truth).
 */

import {
  normalizeProfessionalSkill,
  skillMatchKey,
} from '@/modules/resumes/utils/skill-normalizer.js';

const NOISE =
  /^(required|preferred|skills?|technologies|tools|experience|knowledge|ability|familiarity|proficiency|responsibilities|qualifications?|nice to have|must have|matched|missing|recommended)$/i;

export const cleanSemanticSkill = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/\s+/g, ' ')
    .replace(/^[,|;:\-–—]+|[,|;:\-–—]+$/g, '')
    .trim();
  if (!cleaned || cleaned.length < 2 || cleaned.length > 64) return null;
  if (NOISE.test(cleaned)) return null;
  // Prefer catalog canonical when known (React.js → React); otherwise keep AI label.
  return normalizeProfessionalSkill(cleaned) ?? cleaned;
};

export const dedupeSemanticSkills = (values: unknown): string[] => {
  const source = Array.isArray(values) ? values : typeof values === 'string' ? [values] : [];
  const byKey = new Map<string, string>();

  for (const value of source) {
    const skill = cleanSemanticSkill(value);
    if (!skill) continue;
    const key = skillMatchKey(skill) || skill.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, skill);
  }

  return Array.from(byKey.values());
};

export const dedupeSemanticKeywords = <T extends { term: string }>(items: T[]): T[] => {
  const byKey = new Map<string, T>();
  for (const item of items) {
    const term = cleanSemanticSkill(item.term);
    if (!term) continue;
    const key = skillMatchKey(term) || term.toLowerCase();
    if (byKey.has(key)) continue;
    byKey.set(key, { ...item, term });
  }
  return Array.from(byKey.values());
};
