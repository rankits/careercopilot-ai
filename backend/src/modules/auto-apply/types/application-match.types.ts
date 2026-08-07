/**
 * Stable resume-match port for Auto Apply.
 * Adapters map recommendations / future matchers into this snapshot.
 * Readiness consumes overallScore + status only — not provider internals.
 */

import type { ApplyMode } from '@/modules/auto-apply/types/application-page-analysis.types.js';

export type ApplicationMatchTrigger =
  'PREPARE_APPLICATION' | 'ASSISTED_APPLY' | 'AUTOPILOT' | 'EXTENSION' | 'PLAN_REFRESH';

export type ApplicationMatchStatus =
  | 'READY'
  | 'CACHED'
  | 'SKIPPED_NO_CONSENT'
  | 'SKIPPED_NO_RESUME'
  | 'SKIPPED_FEATURE'
  | 'PENDING'
  | 'FAILED';

export interface ApplicationMatchSnapshot {
  status: ApplicationMatchStatus;
  overallScore: number | null;
  displayScore: number | null;
  resumeVersionId?: string;
  jobId: string;
  analysisId?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
  reasons?: Array<{ code?: string; message: string }>;
  components?: Record<string, number>;
  source: 'RECOMMENDATIONS' | 'RESUME_ANALYSIS' | 'EXTERNAL' | 'NONE';
  computedAt?: Date;
  errorCode?: string;
}

export interface EnsureApplicationMatchInput {
  userId: string;
  jobId: string;
  jobApplicationId?: string;
  analysisId?: string;
  resumeVersionId?: string;
  trigger: ApplicationMatchTrigger;
  applyMode?: ApplyMode;
  jobHints?: {
    title?: string;
    company?: string;
    descriptionText?: string;
    requiredSkills?: string[];
    preferredSkills?: string[];
  };
  allowCompute?: boolean;
}

export interface IApplicationMatchPort {
  ensureMatch(input: EnsureApplicationMatchInput): Promise<ApplicationMatchSnapshot>;
  getLatest(userId: string, jobId: string): Promise<ApplicationMatchSnapshot | null>;
}

export function applyModeToMatchTrigger(mode: ApplyMode): ApplicationMatchTrigger {
  switch (mode) {
    case 'PREPARE':
      return 'PREPARE_APPLICATION';
    case 'ASSISTED':
      return 'ASSISTED_APPLY';
    case 'AUTOPILOT':
      return 'AUTOPILOT';
    case 'EXTENSION':
      return 'EXTENSION';
    default:
      return 'PREPARE_APPLICATION';
  }
}
