import {
  AutoApplyChannelValue,
  JobApplicationDto,
} from '@/modules/auto-apply/types/job-application.types.js';
import { EligibilityResult } from '@/modules/auto-apply/types/eligibility.types.js';
import { ApprovedResumeVersionDto } from '@/modules/auto-apply/types/resume-version.types.js';
import { ApplicationReadinessResult } from '@/modules/auto-apply/types/application-readiness.types.js';
import {
  ApplicationContentPackage,
  PreparedScreeningAnswer,
} from '@/modules/auto-apply/types/application-content.types.js';

export type ApplicationPlanDecision =
  | 'NOT_ELIGIBLE'
  | 'UNSUPPORTED_CHANNEL'
  | 'INFORMATION_REQUIRED'
  | 'READY_FOR_REVIEW';

export interface ApplicationPlanResult {
  application: JobApplicationDto;
  decision: ApplicationPlanDecision;
  channel: AutoApplyChannelValue;
  eligibility: EligibilityResult;
  selectedResumeVersion: ApprovedResumeVersionDto | null;
  unresolvedQuestions: string[];
  /** True when a cover letter and/or vault screening answers were prepared. */
  contentGenerationAvailable: boolean;
  coverLetter: string | null;
  screeningAnswers: PreparedScreeningAnswer[];
  contentWarnings: string[];
  /** Present when the central readiness gate evaluated this plan. */
  readiness?: ApplicationReadinessResult;
}

export type { ApplicationContentPackage, PreparedScreeningAnswer };
