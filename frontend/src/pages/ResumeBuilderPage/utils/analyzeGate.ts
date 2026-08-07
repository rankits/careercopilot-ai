import type { AnalysisResult } from '@/services/resumeBuilder.service';

export const INVALID_TARGET_OOPS_MESSAGE =
  'Oops! You added a wrong Target Role and Job Description. Please check them and try again.';

export const MIN_ATS_TO_CONTINUE = 35;
/** Skills are the primary signal for the low-match warning banner. */
export const MIN_SKILL_MATCH_TO_CONTINUE = 25;

export const LOW_JD_MATCH_MESSAGE =
  'Your resume is a low match for this JD. You can still continue to rebuild and optimize it.';

function isCompleted(analysis: AnalysisResult | null | undefined): boolean {
  return Boolean(analysis && String(analysis.status || '').toUpperCase() === 'COMPLETED');
}

/** Backend AI gate rejected Target Role / JD (ATS forced to 0). */
export function isInvalidTargetAnalysis(analysis: AnalysisResult | null | undefined): boolean {
  if (!isCompleted(analysis)) return false;
  if (analysis!.invalidTarget === true) return true;
  if (
    analysis!.analysisDetails &&
    (analysis!.analysisDetails as { invalidTarget?: boolean }).invalidTarget
  ) {
    return true;
  }
  const message = analysis!.invalidTargetMessage || analysis!.weaknesses?.[0] || '';
  return /oops!.*wrong target role|invalid.?target/i.test(message);
}

export function getInvalidTargetMessage(analysis: AnalysisResult | null | undefined): string {
  const fromApi =
    analysis?.invalidTargetMessage?.trim() ||
    (isInvalidTargetAnalysis(analysis) ? analysis?.weaknesses?.[0]?.trim() : '');
  return fromApi || INVALID_TARGET_OOPS_MESSAGE;
}

/**
 * Low JD match warning (skill < 25 or ATS < 35).
 * Does NOT hard-block Optimize — user can continue and rebuild.
 */
export function isLowJdMatch(analysis: AnalysisResult | null | undefined): boolean {
  if (!isCompleted(analysis) || isInvalidTargetAnalysis(analysis)) return false;
  const ats = analysis!.atsScore ?? 0;
  const skill = analysis!.skillMatch ?? 0;
  const skillOk = skill >= MIN_SKILL_MATCH_TO_CONTINUE;
  const atsOk = ats >= MIN_ATS_TO_CONTINUE;
  return !(skillOk && atsOk);
}

/** Analyze step must not advance only when the target role/JD is invalid. */
export function shouldBlockAnalyzeContinue(analysis: AnalysisResult | null | undefined): boolean {
  return isInvalidTargetAnalysis(analysis);
}

export type AnalyzeGateKind = 'invalid_target' | 'low_match' | null;

export function getAnalyzeGateKind(
  analysis: AnalysisResult | null | undefined,
  isComplete: boolean,
): AnalyzeGateKind {
  if (!isComplete) return null;
  if (isInvalidTargetAnalysis(analysis)) return 'invalid_target';
  if (isLowJdMatch(analysis)) return 'low_match';
  return null;
}
