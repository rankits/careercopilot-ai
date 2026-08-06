import { z } from 'zod';

import { createResumeAiProviders } from '@/modules/resumes/ai/ai-model.factory.js';
import { logger } from '@/shared/logger/logger.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

export const profileAiSuggestInputSchema = z.object({
  fullName: z.string().trim().max(200).optional().default(''),
  email: z.string().trim().max(320).optional().default(''),
  phone: z.string().trim().max(40).optional().default(''),
  location: z.string().trim().max(200).optional().default(''),
  currentCompany: z.string().trim().max(200).optional().default(''),
  designation: z.string().trim().max(200).optional().default(''),
  totalExperience: z.string().trim().max(40).optional().default(''),
  summary: z.string().trim().max(4000).optional().default(''),
  skills: z.string().trim().max(4000).optional().default(''),
  workExperience: z.string().trim().max(8000).optional().default(''),
  education: z.string().trim().max(4000).optional().default(''),
  certifications: z.string().trim().max(4000).optional().default(''),
  projects: z.string().trim().max(8000).optional().default(''),
});

export type ProfileAiSuggestInput = z.infer<typeof profileAiSuggestInputSchema>;

export const profileAiSuggestResultSchema = z.object({
  designation: z.string().catch(''),
  totalExperience: z.string().catch(''),
  summary: z.string().min(1),
  skills: z.array(z.string()).min(1),
  workExperience: z.string().catch(''),
  education: z.string().catch(''),
  certifications: z.string().catch(''),
  projects: z.string().catch(''),
});

export type ProfileAiSuggestResult = z.infer<typeof profileAiSuggestResultSchema>;

const SYSTEM_PROMPT = `You improve candidate profile fields for a job-matching product.
Return ONLY JSON matching the schema. Rules:
- Write a polished professional summary (3-5 sentences) grounded in the provided draft.
- Produce a clean skills list (8-20 items) from skills + experience + projects evidence.
- Improve designation / totalExperience only when the draft supports it; otherwise keep or lightly polish.
- You may lightly polish workExperience, education, certifications, and projects text (keep line breaks).
- Do NOT invent employers, degrees, certifications, tools, or job titles the draft does not support.
- Prefer concise, ATS-friendly wording.`;

const buildDocumentText = (input: ProfileAiSuggestInput): string =>
  [
    `Full name: ${input.fullName || '(missing)'}`,
    `Email: ${input.email || '(missing)'}`,
    `Phone: ${input.phone || '(missing)'}`,
    `Location: ${input.location || '(missing)'}`,
    `Current company: ${input.currentCompany || '(missing)'}`,
    `Designation: ${input.designation || '(missing)'}`,
    `Total experience (years): ${input.totalExperience || '(missing)'}`,
    `Professional summary: ${input.summary || '(missing)'}`,
    `Skills: ${input.skills || '(missing)'}`,
    `Work experience:\n${input.workExperience || '(missing)'}`,
    `Education:\n${input.education || '(missing)'}`,
    `Certifications:\n${input.certifications || '(missing)'}`,
    `Projects:\n${input.projects || '(missing)'}`,
  ].join('\n');

const splitSkills = (value: string): string[] =>
  value
    .split(/[,;\n|/]+/)
    .map((skill) => skill.trim())
    .filter(Boolean);

const uniqueSkills = (skills: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const skill of skills) {
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(skill);
  }
  return result;
};

const buildHeuristicSuggestion = (input: ProfileAiSuggestInput): ProfileAiSuggestResult => {
  const designation = input.designation.trim() || 'Professional';
  const years = input.totalExperience.trim();
  const skills = uniqueSkills([
    ...splitSkills(input.skills),
    ...splitSkills(input.workExperience),
    ...splitSkills(input.projects),
  ]).slice(0, 20);

  const skillPhrase = skills.slice(0, 6).join(', ');
  const experiencePhrase = years ? `${years}+ years of experience` : 'hands-on experience';

  const summary =
    input.summary.trim() ||
    `${designation} with ${experiencePhrase}${
      skillPhrase ? `, skilled in ${skillPhrase}` : ''
    }. Proven ability to deliver results across projects and collaborate with cross-functional teams. Seeking opportunities to apply expertise and grow impact.`;

  return {
    designation: input.designation.trim(),
    totalExperience: input.totalExperience.trim(),
    summary,
    skills: skills.length > 0 ? skills : ['Communication', 'Problem Solving', 'Teamwork'],
    workExperience: input.workExperience.trim(),
    education: input.education.trim(),
    certifications: input.certifications.trim(),
    projects: input.projects.trim(),
  };
};

const hasUsableDraft = (input: ProfileAiSuggestInput): boolean =>
  Boolean(
    input.designation.trim() ||
    input.summary.trim() ||
    input.skills.trim() ||
    input.workExperience.trim() ||
    input.projects.trim() ||
    input.education.trim(),
  );

export async function suggestProfileFields(
  rawInput: ProfileAiSuggestInput,
): Promise<ProfileAiSuggestResult> {
  const input = profileAiSuggestInputSchema.parse(rawInput);

  if (!hasUsableDraft(input)) {
    throw new AppError(
      'Add some profile details or parse a resume before requesting AI suggestions.',
      400,
      'PROFILE_AI_SUGGEST_EMPTY',
    );
  }

  const fallback = buildHeuristicSuggestion(input);

  let providers: ReturnType<typeof createResumeAiProviders>;
  try {
    providers = createResumeAiProviders();
  } catch (error) {
    logger.warn({ err: error }, 'Profile AI suggest providers unavailable; using heuristic');
    return fallback;
  }

  try {
    const aiResult = await providers.gemini.extract({
      systemPrompt: SYSTEM_PROMPT,
      documentText: buildDocumentText(input),
      schema: profileAiSuggestResultSchema,
      metadata: { promptVersion: 'profile-ai-suggest-v1' },
    });

    return {
      designation: aiResult.designation.trim() || fallback.designation,
      totalExperience: aiResult.totalExperience.trim() || fallback.totalExperience,
      summary: aiResult.summary.trim() || fallback.summary,
      skills: uniqueSkills(aiResult.skills.map((s) => s.trim()).filter(Boolean)).length
        ? uniqueSkills(aiResult.skills.map((s) => s.trim()).filter(Boolean))
        : fallback.skills,
      workExperience: aiResult.workExperience.trim() || fallback.workExperience,
      education: aiResult.education.trim() || fallback.education,
      certifications: aiResult.certifications.trim() || fallback.certifications,
      projects: aiResult.projects.trim() || fallback.projects,
    };
  } catch (primaryError) {
    logger.warn({ err: primaryError }, 'Profile AI suggest primary provider failed');
    try {
      const aiResult = await providers.openrouter.extract({
        systemPrompt: SYSTEM_PROMPT,
        documentText: buildDocumentText(input),
        schema: profileAiSuggestResultSchema,
        metadata: { promptVersion: 'profile-ai-suggest-v1' },
      });

      return {
        designation: aiResult.designation.trim() || fallback.designation,
        totalExperience: aiResult.totalExperience.trim() || fallback.totalExperience,
        summary: aiResult.summary.trim() || fallback.summary,
        skills: uniqueSkills(aiResult.skills.map((s) => s.trim()).filter(Boolean)).length
          ? uniqueSkills(aiResult.skills.map((s) => s.trim()).filter(Boolean))
          : fallback.skills,
        workExperience: aiResult.workExperience.trim() || fallback.workExperience,
        education: aiResult.education.trim() || fallback.education,
        certifications: aiResult.certifications.trim() || fallback.certifications,
        projects: aiResult.projects.trim() || fallback.projects,
      };
    } catch (fallbackError) {
      logger.warn({ err: fallbackError }, 'Profile AI suggest fallback provider failed');
      return fallback;
    }
  }
}
