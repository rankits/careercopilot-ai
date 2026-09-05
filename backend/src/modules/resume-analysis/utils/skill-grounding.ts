/**
 * Ground AI skill lists against resume text so matched skills cannot stay at 0
 * when the resume clearly evidences JD technologies (aliases included).
 */

import {
  extractProfessionalSkillsFromText,
  skillAppearsIn,
  skillMatchKey,
} from '@/modules/resumes/utils/skill-normalizer.js';

import { dedupeSemanticSkills } from '@/modules/resume-analysis/utils/semantic-skills.js';

export type GroundedSkillGap = {
  matchedSkills: string[];
  missingSkills: string[];
  additionalSkills: string[];
  recommendedSkills: string[];
  skillMatch: number;
  crossDomain: boolean;
};

const skillEvidencedIn = (evidenceText: string, skill: string): boolean =>
  skillAppearsIn(evidenceText, skill);

export const groundSkillGapAgainstResume = (input: {
  resumeText: string;
  /** Extra structured skills/technologies that may be missing from lossy extract text. */
  structuredSkills?: string[];
  jobDescription?: string;
  targetRole?: string;
  aiMatched?: string[];
  aiMissing?: string[];
  aiRecommended?: string[];
  aiAdditional?: string[];
  aiKeywordTerms?: string[];
}): GroundedSkillGap => {
  const structured = dedupeSemanticSkills(input.structuredSkills ?? []);
  // Evidence pool = resume prose + structured skills/technologies (lossy PDF safety net).
  const evidenceText =
    structured.length > 0
      ? `${input.resumeText}\n\nSKILLS\n${structured.join(', ')}\n`
      : input.resumeText;

  const jdText = [input.jobDescription ?? '', input.targetRole ?? ''].join('\n');
  const jdPool = dedupeSemanticSkills([
    ...extractProfessionalSkillsFromText(jdText),
    ...(input.aiMatched ?? []),
    ...(input.aiMissing ?? []),
    ...(input.aiRecommended ?? []),
    ...(input.aiKeywordTerms ?? []),
  ]);

  const evidencedFromJd = jdPool.filter((skill) => skillEvidencedIn(evidenceText, skill));
  const aiMatchedKeep = dedupeSemanticSkills(input.aiMatched ?? []).filter(
    (skill) =>
      skillEvidencedIn(evidenceText, skill) ||
      evidencedFromJd.some((item) => skillMatchKey(item) === skillMatchKey(skill)),
  );

  const matchedSkills = dedupeSemanticSkills([...evidencedFromJd, ...aiMatchedKeep]);
  const matchedKeys = new Set(matchedSkills.map((skill) => skillMatchKey(skill)));

  const missingSkills = dedupeSemanticSkills([
    ...jdPool.filter((skill) => !matchedKeys.has(skillMatchKey(skill))),
    ...(input.aiMissing ?? []),
  ]).filter((skill) => !matchedKeys.has(skillMatchKey(skill)));

  const additionalSkills = dedupeSemanticSkills([
    ...(input.aiAdditional ?? []),
    ...extractProfessionalSkillsFromText(evidenceText),
    ...structured,
  ]).filter(
    (skill) =>
      !matchedKeys.has(skillMatchKey(skill)) &&
      !missingSkills.some((item) => skillMatchKey(item) === skillMatchKey(skill)),
  );

  const recommendedSkills = dedupeSemanticSkills([
    ...(input.aiRecommended ?? []),
    ...missingSkills,
  ]);

  const crossDomain = matchedSkills.length === 0 && jdPool.length >= 2;
  const skillMatch =
    jdPool.length > 0 ? Math.round((matchedSkills.length / jdPool.length) * 100) : 0;

  return {
    matchedSkills,
    missingSkills,
    additionalSkills,
    recommendedSkills,
    skillMatch: crossDomain ? Math.min(skillMatch, 20) : skillMatch,
    crossDomain,
  };
};
