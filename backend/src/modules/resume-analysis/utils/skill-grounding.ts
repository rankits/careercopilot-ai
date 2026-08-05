/**
 * Ground AI skill lists against resume text so matched skills cannot stay at 0
 * when the resume clearly evidences JD technologies (aliases included).
 */

import {
  extractProfessionalSkillsFromText,
  skillAppearsIn,
  skillMatchKey,
} from '@/modules/resumes/utils/skill-normalizer.js'; //no-eslint-disable-line no-unused-vars

import { dedupeSemanticSkills } from '@/modules/resume-analysis/utils/semantic-skills.js'; //no-eslint-disable-line no-unused-vars

export type GroundedSkillGap = {
  matchedSkills: string[];
  missingSkills: string[];
  additionalSkills: string[];
  recommendedSkills: string[];
  skillMatch: number;
  crossDomain: boolean;
};

export const groundSkillGapAgainstResume = (input: {
  resumeText: string;
  jobDescription?: string;
  targetRole?: string;
  aiMatched?: string[];
  aiMissing?: string[];
  aiRecommended?: string[];
  aiAdditional?: string[];
  aiKeywordTerms?: string[];
}): GroundedSkillGap => {
  const jdText = [input.jobDescription ?? '', input.targetRole ?? ''].join('\n');
  const jdPool = dedupeSemanticSkills([
    ...extractProfessionalSkillsFromText(jdText),
    ...(input.aiMatched ?? []),
    ...(input.aiMissing ?? []),
    ...(input.aiRecommended ?? []),
    ...(input.aiKeywordTerms ?? []),
  ]);

  const evidencedFromJd = jdPool.filter((skill) => skillAppearsIn(input.resumeText, skill));
  const aiMatchedKeep = dedupeSemanticSkills(input.aiMatched ?? []).filter(
    (skill) =>
      skillAppearsIn(input.resumeText, skill) ||
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
    ...extractProfessionalSkillsFromText(input.resumeText),
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
