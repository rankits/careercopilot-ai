import { extractKeywordsFromText, mergeSkillLists, splitSkillTokens } from './skills';
import type { ResumeDraft } from './types';

export interface JobAlignContext {
  preferredSkills?: string[];
  jobDescription?: string;
  matchedSkills?: string[];
  recommendedSkills?: string[];
  /** AI-optimized summary when JD and current profile summary diverge. */
  optimizedSummary?: string;
  /** Target role — used as the subtitle under the candidate name. */
  targetRole?: string;
}

function evidencedIn(blob: string, skill: string) {
  const pattern = new RegExp(
    `\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\b`,
    'i',
  );
  return pattern.test(blob);
}

function alignRole(draft: ResumeDraft, context: JobAlignContext): ResumeDraft {
  const role = context.targetRole?.trim();
  if (!role) return draft;
  return { ...draft, role };
}

function alignSkills(draft: ResumeDraft, context: JobAlignContext): ResumeDraft {
  const resumeBlob = [
    draft.summary,
    draft.skillsList.join(' '),
    ...draft.experiences.map((e) => `${e.title} ${e.company} ${e.details}`),
    ...draft.projectsList.map((p) => `${p.title} ${p.company} ${p.details}`),
  ].join('\n');

  const jdSkills = extractKeywordsFromText(
    [context.jobDescription ?? '', ...(context.preferredSkills ?? [])].join('\n'),
  );
  const preferred = mergeSkillLists(context.preferredSkills);
  const matched = splitSkillTokens((context.matchedSkills ?? []).join(', '));
  const recommended = splitSkillTokens((context.recommendedSkills ?? []).join(', '));

  // Start from current draft skills (includes user-added chips).
  const rebuilt = new Map(
    mergeSkillLists(draft.skillsList).map((skill) => [skill.toLowerCase(), skill] as const),
  );

  // User-declared preferred skills always stay on the resume.
  for (const skill of preferred) {
    rebuilt.set(skill.toLowerCase(), skill);
  }

  // Matched / JD skills only when evidenced in the resume body (no inventing).
  for (const skill of [...matched, ...jdSkills]) {
    if (evidencedIn(resumeBlob, skill)) rebuilt.set(skill.toLowerCase(), skill);
  }

  // Recommended: only surface if already evidenced (user still clicks +chip to add missing ones).
  for (const skill of recommended) {
    if (
      evidencedIn(resumeBlob, skill) ||
      preferred.some((p) => p.toLowerCase() === skill.toLowerCase())
    ) {
      rebuilt.set(skill.toLowerCase(), skill);
    }
  }

  return {
    ...draft,
    skillsList: Array.from(rebuilt.values()).sort((a, b) => a.localeCompare(b)),
  };
}

function alignSummary(draft: ResumeDraft, context: JobAlignContext): ResumeDraft {
  const optimized = context.optimizedSummary?.trim() ?? '';
  const jd = context.jobDescription?.trim() ?? '';
  if (!optimized || optimized.length < 40) return draft;
  if (!jd) return draft;

  const jdKeys = extractKeywordsFromText(jd).slice(0, 8);
  if (jdKeys.length === 0) return draft;

  const summaryHasJd = jdKeys.some((key) => evidencedIn(draft.summary, key));
  const optimizedHasJd = jdKeys.some((key) => evidencedIn(optimized, key));

  // Only swap when current summary is off-JD and AI summary targets the JD.
  if (!summaryHasJd && optimizedHasJd) {
    return { ...draft, summary: optimized };
  }

  return draft;
}

/** Align role subtitle, skills + profile summary to the job description / AI optimizations. */
export function alignDraftToJob(draft: ResumeDraft, context: JobAlignContext = {}): ResumeDraft {
  return alignSummary(alignSkills(alignRole(draft, context), context), context);
}
