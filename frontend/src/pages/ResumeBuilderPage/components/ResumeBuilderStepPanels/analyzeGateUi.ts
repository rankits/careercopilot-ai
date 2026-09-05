import type { AnalysisResult } from '@/services/resumeBuilder.service';

import {
  getAnalyzeGateKind,
  getInvalidTargetMessage,
  LOW_JD_MATCH_MESSAGE,
  type AnalyzeGateKind,
} from '../../utils';

export type AnalyzeGateUi = {
  kind: AnalyzeGateKind;
  subtitle: string;
  bannerTitle: string;
  bannerBody: string;
  tipTitle: string;
  tipText: string;
  ctaLabel: string;
  ctaAction: 'edit_target' | 'replace_resume' | 'continue';
};

const DEFAULT_UI: AnalyzeGateUi = {
  kind: null,
  subtitle: '',
  bannerTitle: '',
  bannerBody: '',
  tipTitle: 'Next: apply fact-preserving AI fixes section by section.',
  tipText:
    'Original resume content is preserved. Missing skills are never added as if you have them.',
  ctaLabel: 'Optimize resume',
  ctaAction: 'continue',
};

export function getAnalyzeGateUi(input: {
  analysis: AnalysisResult | null;
  isComplete: boolean;
  targetRole: string;
  loadingMessage: string;
}): AnalyzeGateUi {
  const { analysis, isComplete, targetRole, loadingMessage } = input;
  const kind = getAnalyzeGateKind(analysis, isComplete);

  if (!isComplete) {
    return {
      ...DEFAULT_UI,
      subtitle: loadingMessage,
      tipTitle: 'Our AI is scoring ATS fit, skill gaps, and rewrite-ready suggestions.',
      tipText:
        'Original resume content is preserved. Missing skills are never added as if you have them.',
      ctaLabel: 'Analysis in progress...',
    };
  }

  if (kind === 'invalid_target') {
    return {
      kind,
      subtitle: 'We could not match your resume to this target role and job description.',
      bannerTitle: getInvalidTargetMessage(analysis),
      bannerBody:
        'ATS score is 0 because this Target Role and Job Description are not valid hiring inputs. Update them, then re-analyze — we do not invent a fake match score.',
      tipTitle: 'Fix your Target Role and Job Description first.',
      tipText: 'Go back, enter a real role and JD, then re-check ATS before optimizing.',
      ctaLabel: 'Edit Target Role & JD',
      ctaAction: 'edit_target',
    };
  }

  if (kind === 'low_match') {
    return {
      kind,
      subtitle: 'Low match for this JD — you can still continue and rebuild your resume.',
      bannerTitle: LOW_JD_MATCH_MESSAGE,
      bannerBody: `ATS is ${analysis?.atsScore ?? 0}/100 and Skill Match is ${analysis?.skillMatch ?? 0}/100. Continue to Optimize to rebuild toward this role, or upload a better-matching resume / change the Target Role & JD.`,
      tipTitle: 'Low match — continue to rebuild anyway.',
      tipText:
        'Skill match under 25% or ATS under 35% is a warning, not a hard stop. Optimize can still help you rewrite toward this JD.',
      ctaLabel: 'Continue to Optimize anyway',
      ctaAction: 'continue',
    };
  }

  return {
    ...DEFAULT_UI,
    subtitle: `Factual ATS scoring against ${targetRole || 'your target role'} — keywords, skills, section quality, and formatting issues.`,
  };
}
