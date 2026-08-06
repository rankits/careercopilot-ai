import type {
  SectionScores,
  SkillAnalysis,
} from '@/modules/resume-analysis/types/resume-analysis.types.js';
import {
  clampScore,
  termAppearsIn,
  uniqSkills,
} from '@/modules/resume-analysis/utils/text-match.js';
import {
  extractProfessionalSkillsFromText,
  normalizeProfessionalSkills,
  skillAppearsIn,
  skillMatchKey,
} from '@/modules/resumes/utils/skill-normalizer.js';

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

/** How dense a section body looks (0–25). */
const sectionSubstance = (content: string, header: RegExp): number => {
  const match = content.match(
    new RegExp(
      `${header.source}[:\\s]*([\\s\\S]{0,1200}?)(?=\\n(?:[A-Z][A-Za-z ]{2,40})\\b|$)`,
      'i',
    ),
  );
  const body = (match?.[1] ?? '').replace(/\s+/g, ' ').trim();
  if (!body) return 0;
  return Math.min(25, Math.floor(body.length / 35));
};

/**
 * Deterministic section scores from resume content + live skill/keyword match.
 * Do not trust model JSON here — compact models often echo static 20/30/40 values.
 */
export const computeSectionScoresFromContent = (input: {
  resumeText: string;
  skillMatch: number;
  keywordMatch: number;
}): SectionScores => {
  const content = input.resumeText || '';
  const skill = clampScore(input.skillMatch);
  const kw = clampScore(input.keywordMatch);

  const hasSummary = /professional\s+summary|\bsummary\b|\bprofile\b|\bobjective\b/i.test(content);
  const hasExperience = /work\s+experience|\bexperience\b|\bemployment\b/i.test(content);
  const hasSkills = /\bskills\b|technologies|tech\s+stack/i.test(content);
  const hasEducation = /\beducation\b|university|bachelor|master|b\.?\s?tech|\bdegree\b/i.test(
    content,
  );
  const hasProjects = /\bprojects?\b/i.test(content);
  const hasAchievements = /\bachievements?\b|\bawards?\b/i.test(content);

  return {
    summary: hasSummary
      ? clampScore(
          18 +
            sectionSubstance(content, /(?:professional\s+)?summary|\bprofile\b|\bobjective\b/i) +
            Math.round(skill * 0.28) +
            Math.round(kw * 0.22),
        )
      : clampScore(Math.round(kw * 0.12)),
    experience: hasExperience
      ? clampScore(
          22 +
            sectionSubstance(content, /(?:work\s+)?experience|\bemployment\b/i) +
            Math.round(skill * 0.38) +
            Math.round(kw * 0.18),
        )
      : clampScore(Math.round(skill * 0.15)),
    // Skills section tracks live skill match directly (primary signal).
    skills: hasSkills
      ? clampScore(Math.max(skill, Math.round(skill * 0.92 + (skill > 0 ? 6 : 0))))
      : clampScore(skill),
    education: hasEducation
      ? clampScore(42 + sectionSubstance(content, /\beducation\b/i) + Math.round(kw * 0.12))
      : 0,
    projects: hasProjects
      ? clampScore(
          20 +
            sectionSubstance(content, /\bprojects?\b/i) +
            Math.round(skill * 0.32) +
            Math.round(kw * 0.12),
        )
      : 0,
    achievements: hasAchievements
      ? clampScore(
          30 +
            sectionSubstance(content, /\bachievements?\b|\bawards?\b/i) +
            Math.round(skill * 0.22),
        )
      : 0,
  };
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
  const storedKeywords = input.keywords.filter((item) => item.term?.trim());

  // When keyword rows are missing, derive them from the JD so scoring still reflects JD ↔ resume.
  const jdSkillPool = normalizeProfessionalSkills(
    extractProfessionalSkillsFromText(
      [input.jobDescription ?? '', input.targetRole ?? ''].join('\n'),
    ),
  );
  const allKeywords: AtsKeyword[] =
    storedKeywords.length > 0
      ? storedKeywords
      : jdSkillPool.map((term) => ({
          term,
          status: skillAppearsIn(content, term) ? 'MATCHED' : 'MISSING',
          importance: 'high',
        }));

  const presentKeywordCount = allKeywords.filter((item) =>
    skillAppearsIn(content, item.term),
  ).length;
  const keywordMatch =
    allKeywords.length > 0 ? clampScore((presentKeywordCount / allKeywords.length) * 100) : 0;

  const recoveredMissing = (
    missingKeywords.length > 0
      ? missingKeywords
      : allKeywords.filter((item) => /missing/i.test(item.status))
  ).filter((item) => skillAppearsIn(content, item.term));
  const retainedMatched = (
    matchedKeywords.length > 0
      ? matchedKeywords
      : allKeywords.filter((item) => /matched/i.test(item.status))
  ).filter((item) => skillAppearsIn(content, item.term));

  const targetSkills = uniqSkills([
    ...skillAnalysis.matchedSkills,
    ...skillAnalysis.missingSkills,
    ...jdSkillPool,
  ]);
  // Dedupe React/React.js style equivalents in the universe so match % isn't diluted.
  const skillUniverseMap = new Map<string, string>();
  for (const skill of targetSkills.length > 0 ? targetSkills : skillAnalysis.recommendedSkills) {
    const key = skillMatchKey(skill);
    if (!key) continue;
    if (!skillUniverseMap.has(key)) skillUniverseMap.set(key, skill);
  }
  const skillUniverse = Array.from(skillUniverseMap.values());
  const matchedSkillCount = skillUniverse.filter((skill) => skillAppearsIn(content, skill)).length;
  const skillMatch =
    skillUniverse.length > 0
      ? clampScore((matchedSkillCount / skillUniverse.length) * 100)
      : keywordMatch;

  const newlyMatchedSkills = skillAnalysis.missingSkills.filter((skill) =>
    skillAppearsIn(content, skill),
  );

  const highImportance = allKeywords.filter((item) => /high/i.test(item.importance));
  const highMatched = highImportance.filter((item) => skillAppearsIn(content, item.term)).length;
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
    if (contentLower.includes(probe.toLowerCase()) || termAppearsIn(content, probe)) return true;
    // Skills applies often land as a rewritten list, not the exact suggestion string.
    if (/skill/i.test(item.category)) {
      const tokens = suggested
        .split(/[,|;/\n]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 1);
      if (tokens.length === 0) return false;
      const present = tokens.filter((token) => termAppearsIn(content, token)).length;
      return present / tokens.length >= 0.5;
    }
    return false;
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
  const skillRecoveryPoints = newlyMatchedSkills.length * 2.8;
  const suggestionPoints = appliedHits.reduce((sum, item) => sum + impactWeight(item.impact), 0);
  const retentionPenalty =
    matchedKeywords.length > 0
      ? Math.round((1 - retainedMatched.length / matchedKeywords.length) * 15)
      : 0;

  const improvementPoints = Math.min(
    40,
    keywordRecoveryPoints + skillRecoveryPoints + suggestionPoints,
  );

  const skillsRecoveredWell =
    skillUniverse.length > 0 &&
    (skillMatch >= 80 ||
      (skillAnalysis.missingSkills.length > 0 &&
        newlyMatchedSkills.length / skillAnalysis.missingSkills.length >= 0.7));
  const suggestionsAppliedWell =
    input.appliedSuggestions.length === 0 ? false : appliedRatio >= 0.4 || appliedHits.length >= 1;
  // Trust Optimize "APPLIED" marks even when exact suggestion text drifted after edits.
  const markedApplied = input.appliedSuggestions.length > 0;
  const optimizeSucceeded =
    (skillsRecoveredWell && (suggestionsAppliedWell || markedApplied)) ||
    (skillMatch >= 90 &&
      (suggestionsAppliedWell || markedApplied || newlyMatchedSkills.length >= 2)) ||
    (skillMatch >= 95 && keywordMatch >= 65) ||
    (skillMatch >= 100 && markedApplied);

  let atsScore: number;
  const hasJdSignals = skillUniverse.length > 0 || allKeywords.length > 0;

  if (improvementPoints >= 2 || optimizeSucceeded) {
    // Guaranteed uplift when the edited resume recovers keywords/skills or lands applied text.
    const uplift = Math.max(optimizeSucceeded ? 18 : 2, Math.round(improvementPoints * 0.75));
    atsScore = clampScore(Math.max(absoluteScore, baseline + uplift - retentionPenalty));
  } else if (hasJdSignals) {
    // Real JD ↔ resume coverage: prefer absolute score so different resumes don't all stick at ~45.
    atsScore = clampScore(
      Math.round(absoluteScore * 0.78 + Math.max(0, baseline - retentionPenalty) * 0.22),
    );
  } else {
    // No meaningful edits and no JD signals: stay near baseline unless matched keywords were removed.
    atsScore = clampScore(
      Math.max(
        absoluteScore,
        baseline - retentionPenalty,
        Math.round(baseline * 0.85 + absoluteScore * 0.15),
      ),
    );
  }

  // Soft ceiling — strong JD matches land ~88–94; typical good applies ~80–87. Never 99.
  const overallCoverage =
    (clampScore(keywordMatch) + clampScore(skillMatch) + clampScore(jdCoverage * 100)) / 300;
  const softCeiling =
    overallCoverage >= 0.92 || (skillMatch >= 95 && keywordMatch >= 85)
      ? 94
      : overallCoverage >= 0.8 || skillMatch >= 90
        ? 91
        : overallCoverage >= 0.65 || skillMatch >= 80
          ? 87
          : overallCoverage >= 0.5
            ? 84
            : 82;
  // Low initial ATS (e.g. 35–45) must still be able to climb into the mid/high 70s after Optimize.
  const maxUpliftFromBaseline = optimizeSucceeded
    ? 45
    : overallCoverage >= 0.9
      ? 36
      : overallCoverage >= 0.7
        ? 30
        : overallCoverage >= 0.5
          ? 24
          : 16;
  atsScore = Math.min(atsScore, softCeiling, baseline + maxUpliftFromBaseline);

  // When skills largely match + suggestions landed, land in a clear “ATS improved” band.
  if (optimizeSucceeded) {
    const optimizeFloor =
      skillMatch >= 95 && keywordMatch >= 80
        ? 80
        : skillMatch >= 90 || (skillMatch >= 85 && suggestionsAppliedWell)
          ? 78
          : 74;
    atsScore = Math.max(atsScore, Math.min(optimizeFloor, softCeiling));
  }

  // Tiny deterministic jitter so identical “perfect” runs don’t always show the same top digit.
  const jitterSeed =
    (presentKeywordCount * 7 + matchedSkillCount * 11 + appliedHits.length * 13) % 3;
  if (atsScore >= softCeiling - 1 && softCeiling >= 90) {
    atsScore = Math.max(baseline, softCeiling - jitterSeed);
  }
  atsScore = clampScore(atsScore);

  const sectionScores = computeSectionScoresFromContent({
    resumeText: content,
    skillMatch,
    keywordMatch,
  });

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
