import { extractJobKeywords } from '@/modules/auto-apply/utils/resume-keyword-extract.util.js';
import type { NormalizedJobDescription } from '@/modules/ai-mail/application/job-description-normalizer.js';
import type { AiMailDraft, JobContext } from '@/modules/ai-mail/domain/ai-mail.types.js';
import { cleanText, stableUnique } from '@/modules/ai-mail/domain/context-normalization.js';
import { extractProfessionalSkillsFromText } from '@/modules/resumes/utils/skill-normalizer.js';

export interface JobContextLimits {
  maxJobRequirements: number;
  maxJobResponsibilities: number;
  maxJobKeywords: number;
}

type Section = 'responsibilities' | 'requirements' | 'preferred' | 'other';

const heading = (line: string): Section | null => {
  if (/^(?:key\s+)?responsibilities|what you(?:'|’)ll do|the role\b/i.test(line))
    return 'responsibilities';
  if (/^(?:minimum|required)\s+qualifications|requirements|what you(?:'|’)ll need/i.test(line))
    return 'requirements';
  if (/^preferred|nice to have|bonus/i.test(line)) return 'preferred';
  return null;
};

const labeledValue = (pattern: RegExp, text: string): string | undefined => {
  const raw = text.match(pattern)?.[1];
  if (!raw) return undefined;
  const firstLine = raw.split(/\r?\n/)[0] ?? raw;
  const withoutNextLabel = firstLine.split(
    /\b(?:job title|position|role|company|organization|requirements|responsibilities)\s*:/i,
  )[0];
  return cleanText(withoutNextLabel, 160);
};

const inferMetadata = (text: string): { roleTitle?: string; companyName?: string } => ({
  roleTitle: labeledValue(/(?:job title|position|role)\s*:\s*([^\n|]{2,160})/i, text),
  companyName: labeledValue(/(?:company|organization)\s*:\s*([^\n|]{2,160})/i, text),
});

export class JobContextBuilder {
  constructor(private readonly limits: JobContextLimits) {}

  build(draft: AiMailDraft, normalized: NormalizedJobDescription): JobContext {
    const sections: Record<Section, string[]> = {
      responsibilities: [],
      requirements: [],
      preferred: [],
      other: [],
    };
    let current: Section = 'other';
    for (const rawLine of normalized.text.split(/\n+/)) {
      const line = rawLine.replace(/^[\s•*\-–—\d.)]+/, '').trim();
      if (!line) continue;
      const next = heading(line.replace(/:$/, ''));
      if (next) {
        current = next;
        continue;
      }
      if (rawLine.trim().match(/^[•*\-–—]|\d+[.)]/)) sections[current].push(line);
    }
    const inferred = inferMetadata(normalized.text);
    const userCompany = cleanText(draft.companyName, 160);
    const userRole = cleanText(draft.roleTitle, 160);
    const technologies = extractProfessionalSkillsFromText(normalized.text).slice(
      0,
      this.limits.maxJobKeywords,
    );
    const keywords = stableUnique([
      ...extractJobKeywords({
        jobTitle: userRole ?? inferred.roleTitle,
        jobDescription: normalized.text,
        requirementTexts: sections.requirements,
      }),
      ...technologies,
    ]).slice(0, this.limits.maxJobKeywords);

    return {
      description: normalized.text,
      recruiterEmail: draft.recruiterEmail.trim().toLowerCase(),
      recruiterName: cleanText(draft.recruiterName, 160),
      companyName: userCompany ?? inferred.companyName,
      roleTitle: userRole ?? inferred.roleTitle,
      jobUrl: draft.jobUrl,
      additionalContext: cleanText(draft.additionalContext, 3000),
      responsibilities: stableUnique(sections.responsibilities).slice(
        0,
        this.limits.maxJobResponsibilities,
      ),
      requirements: stableUnique(sections.requirements).slice(0, this.limits.maxJobRequirements),
      preferredQualifications: stableUnique(sections.preferred).slice(
        0,
        this.limits.maxJobRequirements,
      ),
      technologies,
      keywords,
      suspiciousInstructionsDetected: normalized.suspiciousInstructionsDetected,
      inferredRoleTitle: inferred.roleTitle,
      inferredCompanyName: inferred.companyName,
    };
  }
}
