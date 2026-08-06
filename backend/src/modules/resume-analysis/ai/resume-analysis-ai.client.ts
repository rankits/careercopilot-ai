import { logger } from '@/shared/logger/logger.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import type { AiAnalysisOutput } from '@/modules/resume-analysis/types/resume-analysis.types.js';
import { resumeAnalysisAiSchema } from '@/modules/resume-analysis/ai/resume-analysis-ai.schema.js';
import { buildResumeAnalysisPrompt } from '@/modules/resume-analysis/ai/prompts/resume-analysis.prompt.js';
import {
  INVALID_TARGET_MESSAGE,
  buildTargetRoleJdValidationPrompt,
} from '@/modules/resume-analysis/ai/prompts/validate-target.prompt.js';
import { textAppearsFuzzy } from '@/modules/resume-analysis/utils/text-match.js';
import { buildJdCoverageExtras } from '@/modules/resume-analysis/utils/suggestion-coverage.js';
import {
  cleanSemanticSkill,
  dedupeSemanticKeywords,
  dedupeSemanticSkills,
} from '@/modules/resume-analysis/utils/semantic-skills.js';
import { groundSkillGapAgainstResume } from '@/modules/resume-analysis/utils/skill-grounding.js';
import { skillMatchKey } from '@/modules/resumes/utils/skill-normalizer.js';
import {
  extractJsonObject,
  isNonJsonModelOutput,
  tryRepairJson,
} from '@/modules/resume-analysis/ai/json-repair.js';
import {
  getErrorMessage,
  isProviderExhaustedError,
  isRequestTooLargeError,
  isRetryableModelError,
} from '@/modules/resume-analysis/ai/retry.js';
import {
  getModelCandidates,
  getProviderFallbackChain,
  invokeProviderModel,
  isFreeOpenRouterModel,
  isOpenRouterFreeAutoRouter,
  truncateForAi,
} from '@/modules/resume-analysis/ai/providers.js';
import {
  resolveJdCharLimit,
  resolveResumeCharLimit,
  resumeAnalysisConfig,
} from '@/modules/resume-analysis/config/resume-analysis.config.js';

const normalizeSkillText = (value: string): string =>
  dedupeSemanticSkills(value.split(/[,|;/]+/)).join(', ');

const isGroundedSuggestion = (
  suggestion: AiAnalysisOutput['suggestions'][number],
  resumeText: string,
): boolean => {
  if (!/^(experience|projects)$/i.test(suggestion.category)) return true;
  const original = suggestion.originalText.trim();
  const suggested = suggestion.suggestedText.trim();
  if (!original || !suggested) return false;
  if (original.split(/\n/).length > 1 || suggested.split(/\n/).length > 1) return false;
  return textAppearsFuzzy(resumeText, original);
};

const clampPct = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
};

/**
 * AI semantic ATS + resume-text safety net.
 * AI owns synonyms/scores; grounding prevents "0 matched" when the resume
 * clearly evidences JD skills (React/Node resume vs React JD, etc.).
 */
const finalizeAiSemanticAnalysis = (
  aiResult: AiAnalysisOutput,
  resumeText: string,
  jobDescription?: string,
  targetRole?: string,
): AiAnalysisOutput => {
  const grounded = groundSkillGapAgainstResume({
    resumeText,
    jobDescription,
    targetRole,
    aiMatched: aiResult.skillAnalysis?.matchedSkills,
    aiMissing: [
      ...(aiResult.skillAnalysis?.missingSkills ?? []),
      ...(aiResult.missingSkills ?? []),
    ],
    aiRecommended: aiResult.skillAnalysis?.recommendedSkills,
    aiAdditional: [
      ...(aiResult.skillAnalysis?.additionalSkills ?? []),
      ...(aiResult.additionalSkillsFound ?? []),
      ...(aiResult.skillAnalysis?.transferableSkills ?? []),
    ],
    aiKeywordTerms: [
      ...(aiResult.missingKeywords ?? []).map((item) => item.term),
      ...(aiResult.matchedKeywords ?? []).map((item) => item.term),
    ],
  });

  const { matchedSkills, missingSkills, additionalSkills, recommendedSkills, crossDomain } =
    grounded;
  const matchedKeySet = new Set(matchedSkills.map((skill) => skillMatchKey(skill)));
  const matchedKeywords = dedupeSemanticKeywords([
    ...(aiResult.matchedKeywords ?? []),
    ...matchedSkills.map((term) => ({ term, importance: 'high' as const })),
  ]);
  const missingKeywords = dedupeSemanticKeywords([
    ...(aiResult.missingKeywords ?? []),
    ...missingSkills.map((term) => ({
      term,
      importance: 'high' as const,
      reason: `${term} is required or strongly preferred by the JD and is not evidenced on the resume.`,
    })),
  ]).filter((item) => !matchedKeySet.has(skillMatchKey(item.term)));

  const aiSkillMatch = clampPct(aiResult.skillMatch);
  const skillMatch = crossDomain
    ? Math.min(Math.max(grounded.skillMatch, aiSkillMatch), 20)
    : Math.max(grounded.skillMatch, aiSkillMatch);

  const keywordMatch = crossDomain
    ? Math.min(clampPct(aiResult.keywordMatch), 20)
    : Math.max(clampPct(aiResult.keywordMatch), skillMatch);

  let atsScore = clampPct(aiResult.atsScore, skillMatch);
  if (!crossDomain && matchedSkills.length > 0 && atsScore < 45 && skillMatch >= 35) {
    atsScore = Math.max(atsScore, Math.min(92, Math.round(skillMatch * 0.7 + 20)));
  }
  if (crossDomain) atsScore = Math.min(atsScore, 35);

  const experienceRelevance = crossDomain
    ? 0
    : clampPct(aiResult.experienceRelevance ?? aiResult.sectionScores?.experience, skillMatch);
  const sectionScores = {
    summary: clampPct(aiResult.sectionScores?.summary, skillMatch),
    experience: clampPct(aiResult.sectionScores?.experience ?? experienceRelevance, skillMatch),
    skills: clampPct(aiResult.sectionScores?.skills, skillMatch),
    education: clampPct(aiResult.sectionScores?.education),
    projects: clampPct(aiResult.sectionScores?.projects, Math.round(skillMatch * 0.85)),
    achievements: clampPct(aiResult.sectionScores?.achievements),
  };
  if (!crossDomain && matchedSkills.length > 0) {
    sectionScores.skills = Math.max(sectionScores.skills, skillMatch);
    if (sectionScores.experience < 30 && skillMatch >= 40) {
      sectionScores.experience = Math.max(sectionScores.experience, Math.round(skillMatch * 0.65));
    }
  }

  const strengths = [...(aiResult.strengths ?? [])].filter((item) => item.trim().length > 0);
  if (strengths.length === 0 && matchedSkills.length > 0) {
    strengths.push(`Matched JD skills: ${matchedSkills.slice(0, 6).join(', ')}`);
  }
  if (strengths.length === 0) {
    strengths.push('Resume text is structured enough for ATS parsing.');
  }

  const weaknesses = [...(aiResult.weaknesses ?? [])].filter((item) => item.trim().length > 0);
  if (missingSkills.length > 0 && !weaknesses.some((item) => /missing|skill/i.test(item))) {
    weaknesses.push(`Missing JD skills: ${missingSkills.slice(0, 10).join(', ')}`);
  }

  const atsIssues = [...(aiResult.atsIssues ?? [])].filter(
    (item) => item.issue?.trim() && item.fix?.trim(),
  );
  if (
    missingSkills.length > 0 &&
    !atsIssues.some((item) => /skill/i.test(item.section) || /skill gap/i.test(item.issue))
  ) {
    atsIssues.push({
      issue: 'Skill gap versus job description',
      section: 'skills',
      severity: 'HIGH',
      fix: `Add factual skills or transferable wording for: ${missingSkills.slice(0, 8).join(', ')}`,
    });
  }
  if (crossDomain && !atsIssues.some((item) => /experience/i.test(item.section))) {
    atsIssues.push({
      issue: 'Experience domain does not align with the target role',
      section: 'experience',
      severity: 'HIGH',
      fix: 'Reframe experience toward JD responsibilities with transferable language — do not invent employers or tools.',
    });
  }

  const suggestions = (aiResult.suggestions ?? []).filter((suggestion) =>
    isGroundedSuggestion(suggestion, resumeText),
  );

  const improvedSummary =
    (aiResult.optimizedSections?.professionalSummary ?? '').trim() ||
    (aiResult.improvedSummary ?? '').trim();

  const coverage = buildJdCoverageExtras({
    missingSkills,
    currentSkillsLine:
      dedupeSemanticSkills(aiResult.optimizedSections?.skills ?? []).join(', ') ||
      matchedSkills.slice(0, 8).join(', ') ||
      '',
    improvedSummary,
    targetRole,
    experience: null,
    existing: suggestions,
  });
  for (const item of coverage) {
    suggestions.unshift({ ...item, impact: item.impact });
  }

  const optimizedSummary =
    improvedSummary ||
    (crossDomain && targetRole
      ? `Professional targeting ${targetRole}, bringing transferable strengths from prior experience. Eager to apply proven collaboration and execution skills to ${targetRole} responsibilities.`
      : '');

  return {
    ...aiResult,
    skillAnalysis: {
      matchedSkills,
      missingSkills,
      transferableSkills: additionalSkills,
      additionalSkills,
      recommendedSkills,
    },
    additionalSkillsFound: additionalSkills,
    missingKeywords,
    matchedKeywords,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 7),
    atsIssues: atsIssues.slice(0, 8),
    suggestions: suggestions.map((suggestion) =>
      suggestion.category === 'skills'
        ? { ...suggestion, suggestedText: normalizeSkillText(suggestion.suggestedText) }
        : suggestion,
    ),
    optimizedResumeText: aiResult.optimizedResumeText ?? '',
    optimizedSections: {
      ...aiResult.optimizedSections,
      professionalSummary:
        aiResult.optimizedSections?.professionalSummary?.trim() || optimizedSummary,
      skills: dedupeSemanticSkills([
        ...(aiResult.optimizedSections?.skills ?? []),
        ...matchedSkills,
      ]),
    },
    improvedSummary: aiResult.improvedSummary?.trim() || optimizedSummary,
    missingSkills,
    improvedSkills: dedupeSemanticSkills(aiResult.improvedSkills ?? []),
    recommendedSkillOrder: dedupeSemanticSkills([
      ...(aiResult.recommendedSkillOrder ?? []),
      ...matchedSkills,
      ...recommendedSkills,
    ]),
    skillMatch,
    keywordMatch,
    experienceRelevance,
    sectionScores,
    atsScore,
    contentQuality: clampPct(aiResult.contentQuality),
    readability: clampPct(aiResult.readability),
    formattingScore: clampPct(aiResult.formattingScore),
  };
};

/** Finalize AI output with JD↔resume grounding (not chip-only ATS). */
const enrichAnalysisWithJdSkills = (
  aiResult: AiAnalysisOutput,
  resumeText: string,
  jobDescription?: string,
  targetRole?: string,
): AiAnalysisOutput => finalizeAiSemanticAnalysis(aiResult, resumeText, jobDescription, targetRole);

const sanitizeAiSkillOutput = (aiResult: AiAnalysisOutput): AiAnalysisOutput => {
  void cleanSemanticSkill;
  return aiResult;
};

export const resumeAnalysisAiClient = {
  /**
   * Cheap AI gate before full ATS analysis.
   * Invalid role/JD → skip analyze so we never return a misleading score.
   */
  async validateTargetRoleAndJd(
    targetRole: string,
    jobDescription?: string,
  ): Promise<{ valid: boolean; message: string }> {
    const role = targetRole.trim();
    const jd = (jobDescription ?? '').trim();
    if (role.length < 2 || jd.length < 12) {
      return { valid: false, message: INVALID_TARGET_MESSAGE };
    }

    const providers = getProviderFallbackChain();
    if (providers.length === 0) {
      // No keys — do not invent ATS; treat as invalid so UI can Oops safely.
      return { valid: false, message: INVALID_TARGET_MESSAGE };
    }

    const { systemPrompt, userMessage } = buildTargetRoleJdValidationPrompt(role, jd);
    let lastError: unknown;

    for (const provider of providers) {
      const models = getModelCandidates(provider).slice(0, 2);
      for (const model of models) {
        try {
          logger.info({ provider, model }, 'Validating target role / JD before ATS analysis');
          const rawText = await invokeProviderModel(provider, model, systemPrompt, userMessage);
          if (isNonJsonModelOutput(rawText)) {
            throw new SyntaxError('Non-JSON target validation response');
          }
          let jsonText = extractJsonObject(
            rawText
              .replace(/^```json\s*/i, '')
              .replace(/```$/i, '')
              .trim(),
          );
          try {
            JSON.parse(jsonText);
          } catch {
            jsonText = tryRepairJson(jsonText);
          }
          const parsed = JSON.parse(jsonText) as { valid?: unknown; reason?: unknown };
          const valid = parsed.valid === true;
          const reason =
            typeof parsed.reason === 'string' && parsed.reason.trim()
              ? parsed.reason.trim()
              : INVALID_TARGET_MESSAGE;
          return {
            valid,
            message: valid ? '' : reason || INVALID_TARGET_MESSAGE,
          };
        } catch (err) {
          lastError = err;
          if (isProviderExhaustedError(err)) break;
          logger.warn(
            { err, provider, model },
            'Target role/JD validation model failed; trying next',
          );
        }
      }
    }

    logger.warn(
      { err: lastError },
      'Target role/JD validation failed for all providers — blocking analysis',
    );
    return { valid: false, message: INVALID_TARGET_MESSAGE };
  },

  async analyze(
    resumeText: string,
    targetRole: string,
    experienceLevel: string,
    jobDescription?: string,
  ): Promise<AiAnalysisOutput> {
    const providers = getProviderFallbackChain();
    if (providers.length === 0) {
      throw new AppError(
        'No AI provider keys configured. Set OPENROUTER_API_KEY and/or GROQ_API_KEY (or OPENAI_API_KEY / GOOGLE_API_KEY).',
        500,
      );
    }

    logger.info(
      {
        providers,
        resumeChars: resumeText.length,
        jdChars: jobDescription?.length ?? 0,
      },
      'Resume analysis AI starting (OpenRouter preferred, then fallbacks)',
    );

    let lastError: unknown;
    for (const provider of providers) {
      const models = getModelCandidates(provider);
      for (const model of models) {
        // Compact by default — full prompt routinely truncates under credit max_tokens caps.
        const preferFullPrompt = resumeAnalysisConfig.fullPrompt;
        let compact =
          provider === 'groq' ||
          isFreeOpenRouterModel(model) ||
          (provider === 'openrouter' && !preferFullPrompt);
        const resumeLimit = resolveResumeCharLimit({ provider, compact });
        const jdLimit = resolveJdCharLimit(provider);

        let safeResume = truncateForAi(resumeText, resumeLimit);
        let safeJd = jobDescription ? truncateForAi(jobDescription, jdLimit) : jobDescription;

        const runOnce = async (resume: string, jd: string | undefined, useCompact: boolean) => {
          const { systemPrompt, userMessage } = buildResumeAnalysisPrompt(
            resume,
            targetRole,
            experienceLevel,
            jd,
            { compact: useCompact },
          );
          logger.info(
            {
              provider,
              model,
              compact: useCompact,
              resumeChars: resume.length,
              jdChars: jd?.length ?? 0,
            },
            'Resume analysis invoking AI model',
          );
          const rawText = await invokeProviderModel(provider, model, systemPrompt, userMessage);
          if (isNonJsonModelOutput(rawText)) {
            throw new SyntaxError(
              `Model returned non-JSON output: ${rawText.slice(0, 120).replace(/\s+/g, ' ')}`,
            );
          }
          let jsonText = extractJsonObject(
            rawText
              .replace(/^```json\s*/i, '')
              .replace(/```$/i, '')
              .trim(),
          );
          try {
            JSON.parse(jsonText);
          } catch {
            jsonText = tryRepairJson(jsonText);
          }
          let parsedJson: unknown;
          try {
            parsedJson = JSON.parse(jsonText);
          } catch (parseErr) {
            // Last resort: strip from the unterminated tail and re-repair.
            const softer = tryRepairJson(jsonText.slice(0, Math.max(200, jsonText.length - 400)));
            parsedJson = JSON.parse(softer);
            logger.warn(
              { provider, model, parseErr: getErrorMessage(parseErr) },
              'Parsed resume analysis JSON after aggressive tail trim',
            );
          }
          return resumeAnalysisAiSchema.parse(parsedJson) as AiAnalysisOutput;
        };

        try {
          let parsed: AiAnalysisOutput;
          try {
            parsed = await runOnce(safeResume, safeJd, compact);
          } catch (err) {
            // Shrink input and retry once on context/TPM overflow.
            if (isRequestTooLargeError(err)) {
              logger.warn(
                { err, provider, model },
                'Prompt too large; retrying same model with smaller resume/JD',
              );
              safeResume = truncateForAi(safeResume, Math.floor(safeResume.length * 0.55));
              safeJd = safeJd
                ? truncateForAi(safeJd, Math.max(800, Math.floor(safeJd.length * 0.55)))
                : safeJd;
              parsed = await runOnce(safeResume, safeJd, true);
            } else if (
              !compact &&
              (err instanceof SyntaxError ||
                /unterminated string|unexpected end of json|non-json/i.test(getErrorMessage(err)))
            ) {
              // Truncated full-prompt responses (often after affordability max_tokens cut).
              logger.warn(
                { err, provider, model, wasCompact: compact },
                'Invalid/truncated JSON; retrying same model in compact mode',
              );
              compact = true;
              safeResume = truncateForAi(
                safeResume,
                Math.min(safeResume.length, resumeAnalysisConfig.compactResumeChars),
              );
              safeJd = safeJd
                ? truncateForAi(
                    safeJd,
                    Math.min(safeJd.length, resumeAnalysisConfig.compactJdChars),
                  )
                : safeJd;
              parsed = await runOnce(safeResume, safeJd, true);
            } else if (
              compact &&
              (err instanceof SyntaxError ||
                /unterminated string|unexpected end of json/i.test(getErrorMessage(err)))
            ) {
              // Already compact + still truncated → shrink further once, then bail to Groq.
              logger.warn(
                { err, provider, model },
                'Compact JSON still truncated; retrying once with smaller input',
              );
              safeResume = truncateForAi(
                safeResume,
                Math.max(1200, Math.floor(safeResume.length * 0.5)),
              );
              safeJd = safeJd
                ? truncateForAi(safeJd, Math.max(600, Math.floor(safeJd.length * 0.5)))
                : safeJd;
              parsed = await runOnce(safeResume, safeJd, true);
            } else {
              throw err;
            }
          }

          logger.info(
            { provider, model, primary: provider === providers[0] },
            'Resume analysis AI succeeded',
          );
          return sanitizeAiSkillOutput(
            enrichAnalysisWithJdSkills(parsed, resumeText, jobDescription, targetRole),
          );
        } catch (err) {
          lastError = err;
          const message = getErrorMessage(err).toLowerCase();
          if (
            message.includes('unterminated string') ||
            message.includes('unexpected end of json') ||
            message.includes('invalid resume analysis') ||
            message.includes('non-json') ||
            err instanceof SyntaxError
          ) {
            logger.error({ err, model, provider }, 'Invalid resume analysis response');
            // Paid Gemini truncation: skip remaining OpenRouter free models → Groq.
            if (provider === 'openrouter' && !isFreeOpenRouterModel(model)) {
              logger.warn(
                { model, provider },
                'Primary OpenRouter model returned bad JSON; switching to Groq/next provider',
              );
              break;
            }
            continue;
          }
          // openrouter/free + other free models often return empty — jump to Groq fast.
          if (
            provider === 'openrouter' &&
            message.includes('empty content') &&
            (isOpenRouterFreeAutoRouter(model) || isFreeOpenRouterModel(model))
          ) {
            logger.warn(
              { err, model, provider },
              'Empty free OpenRouter content; skipping remaining free models and switching to Groq/next provider',
            );
            break;
          }
          if (isProviderExhaustedError(err)) {
            logger.warn(
              { err, model, provider },
              'Resume analysis provider exhausted (credits/quota/TPD); switching provider',
            );
            break;
          }
          if (!isRetryableModelError(err)) {
            logger.warn(
              { err, model, provider },
              'Resume analysis non-retryable model error; trying next model/provider',
            );
            continue;
          }
          logger.warn(
            { err, model, provider },
            'Resume analysis AI model failed; trying fallback model/provider',
          );
        }
      }
    }

    const detail = getErrorMessage(lastError);
    throw lastError instanceof Error
      ? lastError
      : new AppError(`AI analysis failed for all providers/models: ${detail}`, 500);
  },
};
