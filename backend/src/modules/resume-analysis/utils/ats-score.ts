import type {
  SectionScores,
  SkillAnalysis,
} from '@/modules/resume-analysis/types/resume-analysis.types.js';
import {
  clampScore,
  termAppearsIn,
  uniqSkills,
} from '@/modules/resume-analysis/utils/text-match.js';

export type AtsKeyword = { term: string; status: string; importance: string };

export type AtsAppliedSuggestion = {
  category: string;
  originalText: string;
  suggestedText: string;
  impact: string;
};

export type AtsScoreInput = {
  content: string;
  baselineAtsScore: number;
  jobDescription?: string | null;
  targetRole?: string | null;
  keywords: AtsKeyword[];
  skillAnalysis: SkillAnalysis;
  appliedSuggestions: AtsAppliedSuggestion[];
};

export type AtsScoreResult = {
  atsScore: number;
  keywordMatch: number;
  skillMatch: number;
  contentQuality: number;
  readability: number;
  formattingScore: number;
  sectionScores: SectionScores;
};

const EMPTY_SKILL_ANALYSIS: SkillAnalysis = {
  matchedSkills: [],
  missingSkills: [],
  transferableSkills: [],
  recommendedSkills: [],
};

const impactWeight = (impact: string): number => {
  if (/high/i.test(impact)) return 5;
  if (/medium/i.test(impact)) return 3;
  return 1.5;
};

const importanceWeight = (importance: string): number => {
  if (/high/i.test(importance)) return 3;
  if (/medium/i.test(importance)) return 2;
  return 1;
};

/**
 * Deterministic ATS recheck.
 * Rewards recovered missing keywords/skills and applied suggestions so the
 * score reliably rises after Optimize — without fake path-to-99 boosts.
 */
export const scoreEditedResume = (input: AtsScoreInput): AtsScoreResult => {
  const content = input.content.trim();
  const contentLower = content.toLowerCase();
  const baseline = clampScore(input.baselineAtsScore);
  const skillAnalysis = input.skillAnalysis ?? EMPTY_SKILL_ANALYSIS;

  const missingKeywords = input.keywords.filter((item) => /missing/i.test(item.status));
  const matchedKeywords = input.keywords.filter((item) => /matched/i.test(item.status));
  const allKeywords = input.keywords.filter((item) => item.term?.trim());

  const presentKeywordCount = allKeywords.filter((item) =>
    termAppearsIn(content, item.term),
  ).length;
  const keywordMatch =
    allKeywords.length > 0
      ? clampScore((presentKeywordCount / allKeywords.length) * 100)
      : baseline;

  const recoveredMissing = missingKeywords.filter((item) => termAppearsIn(content, item.term));
  const retainedMatched = matchedKeywords.filter((item) => termAppearsIn(content, item.term));

  const targetSkills = uniqSkills([
    ...skillAnalysis.matchedSkills,
    ...skillAnalysis.missingSkills,
    ...skillAnalysis.recommendedSkills,
  ]);
  const matchedSkillCount = targetSkills.filter((skill) => termAppearsIn(content, skill)).length;
  const skillMatch =
    targetSkills.length > 0
      ? clampScore((matchedSkillCount / targetSkills.length) * 100)
      : keywordMatch;

  const newlyMatchedSkills = skillAnalysis.missingSkills.filter((skill) =>
    termAppearsIn(content, skill),
  );

  const highImportance = allKeywords.filter((item) => /high/i.test(item.importance));
  const highMatched = highImportance.filter((item) => termAppearsIn(content, item.term)).length;
  const highCoverage =
    highImportance.length > 0
      ? highMatched / highImportance.length
      : presentKeywordCount > 0
        ? 1
        : 0.55;

  const hasSummary = /professional\s+summary|summary|profile/i.test(content);
  const hasExperience = /experience|work\s+history|employment/i.test(content);
  const hasSkills = /skills|technologies|tech\s+stack/i.test(content);
  const hasEducation = /education|university|bachelor|master|b\.?tech/i.test(content);
  const sectionCoverage =
    [hasSummary, hasExperience, hasSkills, hasEducation].filter(Boolean).length / 4;

  const lines = content
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const avgLineLen =
    lines.length > 0 ? lines.reduce((sum, line) => sum + line.length, 0) / lines.length : 0;
  const readability = clampScore(
    55 +
      (avgLineLen > 20 && avgLineLen < 140 ? 20 : 8) +
      (lines.length >= 12 ? 15 : lines.length >= 6 ? 8 : 0) +
      (content.length > 400 ? 10 : 0),
  );

  const formattingScore = clampScore(
    50 +
      (hasSummary ? 10 : 0) +
      (hasExperience ? 12 : 0) +
      (hasSkills ? 12 : 0) +
      (hasEducation ? 8 : 0) +
      (!/[│┃]|^\s{20,}\S/m.test(content) ? 8 : 0),
  );

  const appliedHits = input.appliedSuggestions.filter((item) => {
    const suggested = item.suggestedText?.trim();
    if (!suggested) return false;
    const probe = suggested.length > 80 ? suggested.slice(0, 60) : suggested;
    return contentLower.includes(probe.toLowerCase()) || termAppearsIn(content, probe);
  });

  const appliedRatio =
    input.appliedSuggestions.length > 0 ? appliedHits.length / input.appliedSuggestions.length : 0;

  const contentQuality = clampScore(
    40 +
      sectionCoverage * 25 +
      highCoverage * 20 +
      appliedRatio * 15 +
      (content.length > 600 ? 5 : 0),
  );

  const jdBlob = [input.jobDescription ?? '', input.targetRole ?? ''].join('\n');
  const jdTerms = jdBlob
    ? uniqSkills(
        (
          jdBlob.match(
            /\b(?:[A-Z]{2,6}|[A-Za-z]+(?:\.[A-Za-z]+)+|C\+\+|C#|\.NET|[A-Z][a-zA-Z0-9+#.-]{1,20})\b/g,
          ) ?? []
        ).slice(0, 40),
      )
    : [];
  const jdHits = jdTerms.filter((term) => termAppearsIn(content, term)).length;
  const jdCoverage = jdTerms.length > 0 ? jdHits / jdTerms.length : highCoverage;

  const absoluteScore = clampScore(
    keywordMatch * 0.3 +
      skillMatch * 0.26 +
      contentQuality * 0.18 +
      formattingScore * 0.12 +
      readability * 0.05 +
      jdCoverage * 100 * 0.09,
  );

  // Improvement signals — these drive score UP after Optimize applies suggestions / JD skills.
  const keywordRecoveryPoints = recoveredMissing.reduce(
    (sum, item) => sum + importanceWeight(item.importance),
    0,
  );
  const skillRecoveryPoints = newlyMatchedSkills.length * 2.5;
  const suggestionPoints = appliedHits.reduce((sum, item) => sum + impactWeight(item.impact), 0);
  const retentionPenalty =
    matchedKeywords.length > 0
      ? Math.round((1 - retainedMatched.length / matchedKeywords.length) * 15)
      : 0;

  const improvementPoints = Math.min(
    38,
    keywordRecoveryPoints + skillRecoveryPoints + suggestionPoints,
  );

  let atsScore: number;
  if (improvementPoints >= 2) {
    // Guaranteed uplift when the edited resume recovers keywords/skills or lands applied text.
    const uplift = Math.max(3, Math.round(improvementPoints * 0.75));
    atsScore = clampScore(Math.max(absoluteScore, baseline + uplift - retentionPenalty));
  } else {
    // No meaningful edits: stay near baseline unless matched keywords were removed.
    atsScore = clampScore(
      Math.max(
        absoluteScore,
        baseline - retentionPenalty,
        Math.round(baseline * 0.85 + absoluteScore * 0.15),
      ),
    );
  }

  const sectionScores: SectionScores = {
    summary: clampScore(hasSummary ? 55 + highCoverage * 30 + appliedRatio * 10 : 25),
    experience: clampScore(hasExperience ? 55 + skillMatch * 0.25 : 25),
    skills: clampScore(skillMatch * 0.85 + (hasSkills ? 10 : 0)),
    education: clampScore(hasEducation ? 75 : 40),
    projects: clampScore(/projects?/i.test(content) ? 70 + skillMatch * 0.15 : 35),
    achievements: clampScore(/achievements?|awards?/i.test(content) ? 70 : 40),
  };

  return {
    atsScore,
    keywordMatch,
    skillMatch,
    contentQuality,
    readability,
    formattingScore,
    sectionScores,
  };
};
