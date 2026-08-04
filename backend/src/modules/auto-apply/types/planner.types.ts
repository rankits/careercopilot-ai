import {
  AutoApplyChannelValue,
  JobApplicationDto,
} from '@/modules/auto-apply/types/job-application.types.js';
import { EligibilityResult } from '@/modules/auto-apply/types/eligibility.types.js';
import { ApprovedResumeVersionDto } from '@/modules/auto-apply/types/resume-version.types.js';

export type ApplicationPlanDecision =
  'NOT_ELIGIBLE' | 'UNSUPPORTED_CHANNEL' | 'INFORMATION_REQUIRED' | 'READY_FOR_REVIEW';

export interface ApplicationPlanResult {
  application: JobApplicationDto;
  decision: ApplicationPlanDecision;
  channel: AutoApplyChannelValue;
  eligibility: EligibilityResult;
  selectedResumeVersion: ApprovedResumeVersionDto | null;
  unresolvedQuestions: string[];
  /** Always false until AJA-AI-001/AJA-AI-002 (grounded cover-letter and
   * screening-answer generation, gated by safety checks) are built — a
   * deliberate placeholder rather than a fabricated cover letter. */
  contentGenerationAvailable: false;
}
