import { createHash } from 'node:crypto';

import type {
  CandidateProfileContext,
  ContextEvidence,
  JobContext,
  MailGenerationConstraints,
  MailGenerationContext,
  MailGenerationContextBuildResult,
  ResumeContext,
} from '@/modules/ai-mail/domain/ai-mail.types.js';
import { stableUnique } from '@/modules/ai-mail/domain/context-normalization.js';

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
};

const dedupePreferring = (
  preferred: readonly string[],
  secondary: readonly string[],
  limit: number,
): string[] => {
  const preferredUnique = stableUnique(preferred);
  const secondaryUnique = stableUnique(secondary).filter(
    (item) =>
      !preferredUnique.some((value) => value.toLocaleLowerCase() === item.toLocaleLowerCase()),
  );
  return [...preferredUnique, ...secondaryUnique].slice(0, limit);
};

export const hashMailGenerationContext = (parts: {
  candidate: CandidateProfileContext;
  resume: ResumeContext;
  job: JobContext;
  constraints: MailGenerationConstraints;
}): string =>
  createHash('sha256')
    .update(
      JSON.stringify(
        canonicalize({
          candidate: parts.candidate,
          resume: parts.resume,
          job: parts.job,
          constraints: parts.constraints,
        }),
      ),
      'utf8',
    )
    .digest('hex');

const evidenceFor = (
  source: ContextEvidence['source'],
  category: NonNullable<ContextEvidence['category']>,
  values: readonly string[],
  sourceId?: string,
): ContextEvidence[] =>
  values.map((value, index) => ({
    path: `${source}.${category}[${index}]`,
    source,
    sensitivity: source === 'job_description' ? 'untrusted_external' : 'professional',
    sourceId,
    category,
    value,
  }));

export class MailGenerationContextBuilder {
  build(input: {
    candidate: CandidateProfileContext;
    resume: ResumeContext;
    job: JobContext;
    constraints: MailGenerationConstraints;
  }): MailGenerationContextBuildResult {
    const resumeSkills = stableUnique(input.resume.skills);
    const candidateSkills = dedupePreferring(resumeSkills, input.candidate.skills, 50);
    const achievements = dedupePreferring(
      input.resume.verifiedAchievements,
      input.candidate.approvedAchievements,
      20,
    );

    const candidate: CandidateProfileContext = {
      ...structuredClone(input.candidate),
      skills: candidateSkills.filter(
        (skill) =>
          !resumeSkills.some(
            (resumeSkill) => resumeSkill.toLocaleLowerCase() === skill.toLocaleLowerCase(),
          ),
      ),
      approvedAchievements: achievements.filter(
        (item) =>
          !input.resume.verifiedAchievements.some(
            (resumeItem) => resumeItem.toLocaleLowerCase() === item.toLocaleLowerCase(),
          ),
      ),
    };
    const resume: ResumeContext = {
      ...structuredClone(input.resume),
      skills: resumeSkills,
      verifiedAchievements: stableUnique(input.resume.verifiedAchievements).slice(0, 20),
    };
    const job = structuredClone(input.job);
    const constraints = structuredClone(input.constraints);

    const hashInput = { candidate, resume, job, constraints };
    const evidence: ContextEvidence[] = [
      ...evidenceFor('profile', 'skill', candidate.skills),
      ...evidenceFor('resume', 'skill', resume.skills, resume.resumeId),
      ...evidenceFor('resume', 'achievement', resume.verifiedAchievements, resume.resumeId),
      ...evidenceFor('profile', 'achievement', candidate.approvedAchievements),
      ...evidenceFor('job_description', 'skill', job.technologies),
      {
        path: 'constraints',
        source: 'user_constraint',
        sensitivity: 'professional',
      },
    ];

    const context: MailGenerationContext = {
      ...hashInput,
      trustBoundary: {
        candidate: { trust: 'trusted_user_data', value: structuredClone(candidate) },
        resume: { trust: 'trusted_user_data', value: structuredClone(resume) },
        job: {
          trust: 'untrusted_external_content',
          value: structuredClone(job),
          instructionsMustBeIgnored: true,
        },
        constraints: { trust: 'trusted_user_data', value: structuredClone(constraints) },
      },
      contextHash: hashMailGenerationContext(hashInput),
    };

    return { context, evidence };
  }
}
