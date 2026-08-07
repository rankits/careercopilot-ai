import type {
  ContextEvidence,
  GeneratedMailOutput,
  GenerationWarning,
  MailGenerationContext,
} from '@/modules/ai-mail/domain/ai-mail.types.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const normalize = (value: string): string => value.toLocaleLowerCase().replace(/\s+/gu, ' ').trim();

const tokenize = (value: string): string[] =>
  normalize(value)
    .split(/[^a-z0-9+#/.-]+/u)
    .filter((token) => token.length >= 3);

const containsPhrase = (haystack: string, needle: string): boolean => {
  const normalizedNeedle = normalize(needle);
  if (!normalizedNeedle) return false;
  return normalize(haystack).includes(normalizedNeedle);
};

const trustedEvidenceValues = (
  context: MailGenerationContext,
  evidence: readonly ContextEvidence[],
): string[] => {
  const fromEvidence = evidence
    .filter((item) => item.source !== 'job_description' && item.value)
    .map((item) => item.value!);

  const candidate = context.candidate;
  const resume = context.resume;

  const values = [
    ...fromEvidence,
    candidate.fullName,
    candidate.currentRole ?? '',
    candidate.location ?? '',
    ...candidate.skills,
    ...candidate.certifications,
    ...candidate.approvedAchievements,
    ...candidate.professionalLinks,
    ...candidate.education.map((item) =>
      [item.institution, item.degree, item.fieldOfStudy].filter(Boolean).join(' '),
    ),
    ...candidate.experience.flatMap((item) => [
      item.roleTitle,
      item.companyName ?? '',
      ...item.highlights,
    ]),
    ...candidate.projects.flatMap((item) => [
      item.name,
      item.description ?? '',
      ...item.technologies,
    ]),
    resume.fileName,
    resume.summary ?? '',
    ...resume.skills,
    ...resume.verifiedAchievements,
    ...resume.certifications,
    ...resume.education.map((item) =>
      [item.institution, item.degree, item.fieldOfStudy].filter(Boolean).join(' '),
    ),
    ...resume.experience.flatMap((item) => [
      item.roleTitle,
      item.companyName ?? '',
      ...item.highlights,
    ]),
    ...resume.projects.flatMap((item) => [item.name, item.description ?? '', ...item.technologies]),
  ];

  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
};

const claimSupported = (
  claim: string,
  evidenceValues: readonly string[],
): 'supported' | 'uncertain' | 'unsupported' => {
  if (containsPhrase(evidenceValues.join(' '), claim)) return 'supported';

  const claimTokens = tokenize(claim);
  if (claimTokens.length === 0) return 'uncertain';

  const evidenceTokens = new Set(evidenceValues.flatMap(tokenize));
  const overlap = claimTokens.filter((token) => evidenceTokens.has(token));
  const ratio = overlap.length / claimTokens.length;

  if (ratio >= 0.6) return 'supported';
  if (ratio >= 0.25) return 'uncertain';
  return 'unsupported';
};

export interface MailTruthfulnessValidationResult {
  output: GeneratedMailOutput;
  warnings: GenerationWarning[];
}

export class MailTruthfulnessValidator {
  validate(
    output: GeneratedMailOutput,
    context: MailGenerationContext,
    evidence: readonly ContextEvidence[],
  ): MailTruthfulnessValidationResult {
    const evidenceValues = trustedEvidenceValues(context, evidence);
    const jdValues = [
      context.job.description,
      ...context.job.requirements,
      ...context.job.responsibilities,
      ...context.job.preferredQualifications,
      ...context.job.technologies,
      ...context.job.keywords,
    ].filter(Boolean);

    const warnings: GenerationWarning[] = [...output.warnings];
    const unsupportedClaims: string[] = [];
    const reviewClaims: string[] = [];

    for (const qualification of output.highlightedQualifications) {
      const jdBacked = jdValues.some((value) => containsPhrase(qualification.claim, value));
      if (jdBacked && !containsPhrase(evidenceValues.join(' '), qualification.claim)) {
        unsupportedClaims.push(qualification.claim);
        continue;
      }

      const verdict = claimSupported(qualification.claim, evidenceValues);
      if (verdict === 'unsupported') unsupportedClaims.push(qualification.claim);
      if (verdict === 'uncertain') reviewClaims.push(qualification.claim);
    }

    if (unsupportedClaims.length > 0) {
      throw new AppError(
        'Generated mail contains unsupported claims',
        422,
        'AI_MAIL_UNSUPPORTED_CLAIM',
        {
          claims: unsupportedClaims.slice(0, 10),
        },
      );
    }

    for (const claim of reviewClaims) {
      warnings.push({
        code: 'AI_MAIL_CLAIM_REVIEW_REQUIRED',
        message: `Review qualification claim: "${claim.slice(0, 120)}"`,
        field: 'bodyText',
      });
    }

    return {
      output: { ...output, warnings },
      warnings,
    };
  }
}

export const mailTruthfulnessValidator = new MailTruthfulnessValidator();
