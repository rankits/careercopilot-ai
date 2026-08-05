import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useCandidateProfile } from '@/features/auto-apply/hooks/useCandidateProfile';
import { useConsents } from '@/features/auto-apply/hooks/useConsents';
import { useCreatePlan } from '@/features/auto-apply/hooks/usePlan';
import { useResumeVersions } from '@/features/auto-apply/hooks/useResumeVersions';
import { useInitiateSubmission } from '@/features/auto-apply/hooks/useSubmissions';

import { ROUTES } from '@/constants/routes';
import { isAutoApplyClientError } from '@/features/auto-apply/utils/apiError';
import {
  getAutoApplySetupGaps,
  isAutoApplySetupComplete,
} from '@/features/auto-apply/utils/setupCompleteness';
import { openExternalApply } from '@/features/jobs/utils/openExternalApply';

export interface TrackAndOpenApplyInput {
  jobId: string | null | undefined;
  applyUrl?: string | null;
  /** When false, stay on the current page after tracking (default: navigate to Submissions). */
  navigateToSubmissions?: boolean;
  /** When true, also open the employer apply URL (default: false for Assisted Apply). */
  openExternal?: boolean;
}

export interface TrackAndOpenApplyResult {
  tracked: boolean;
  alreadyTracked: boolean;
  openedExternal: boolean;
  setupIncomplete?: boolean;
}

/**
 * Starts Auto Apply tracking for a platform job, auto-prepares the application
 * review, and sends the user to Auto Apply → Submissions.
 */
export function useTrackAndOpenApply() {
  const initiate = useInitiateSubmission();
  const createPlan = useCreatePlan();
  const { data: profile } = useCandidateProfile();
  const { data: resumes } = useResumeVersions();
  const { data: consents } = useConsents();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const trackAndOpenApply = useCallback(
    async (input: TrackAndOpenApplyInput): Promise<TrackAndOpenApplyResult> => {
      const shouldNavigate = input.navigateToSubmissions !== false;
      const shouldOpenExternal = input.openExternal === true;
      const goToSubmissions = () => {
        if (shouldNavigate) {
          void navigate(`${ROUTES.AUTO_APPLY}?tab=submissions`);
        }
      };
      const goToSetup = () => {
        void navigate(ROUTES.AUTO_APPLY);
      };

      if (!input.jobId) {
        const openedExternal = shouldOpenExternal ? openExternalApply(input.applyUrl) : false;
        showToast({
          message: 'Unable to start Assisted Apply — this listing has no job ID.',
          severity: 'warning',
        });
        return { tracked: false, alreadyTracked: false, openedExternal };
      }

      if (!isAutoApplySetupComplete({ profile, resumes, consents })) {
        const firstGap = getAutoApplySetupGaps({ profile, resumes, consents })[0];
        showToast({
          message: firstGap
            ? `Finish Auto Apply setup first: ${firstGap.label}.`
            : 'Finish Auto Apply setup before starting Assisted Apply.',
          severity: 'warning',
        });
        goToSetup();
        return {
          tracked: false,
          alreadyTracked: false,
          openedExternal: false,
          setupIncomplete: true,
        };
      }

      try {
        const result = await initiate.mutateAsync(input.jobId);
        if (result.application.jobId) {
          try {
            await createPlan.mutateAsync(result.application.jobId);
          } catch {
            // Submissions tab will retry auto-review.
          }
        }
        const openedExternal = shouldOpenExternal ? openExternalApply(input.applyUrl) : false;
        const hasDuplicates = result.possibleDuplicates.length > 0;

        showToast({
          message: hasDuplicates
            ? 'Assisted Apply started — a possible duplicate was detected. Continue in Submissions.'
            : 'Assisted Apply started. Application review is ready in Submissions.',
          severity: hasDuplicates ? 'warning' : 'success',
        });
        goToSubmissions();
        return { tracked: true, alreadyTracked: false, openedExternal };
      } catch (error) {
        const openedExternal = shouldOpenExternal ? openExternalApply(input.applyUrl) : false;
        const alreadyTracked = isAutoApplyClientError(error) && error.code === 'APPLICATION_EXISTS';

        if (alreadyTracked) {
          showToast({
            message: 'This job is already in your Auto Apply submissions.',
            severity: 'info',
          });
          goToSubmissions();
          return { tracked: false, alreadyTracked: true, openedExternal };
        }

        showToast({
          message:
            error instanceof Error ? error.message : 'Unable to start Assisted Apply for this job.',
          severity: 'error',
        });
        return { tracked: false, alreadyTracked: false, openedExternal };
      }
    },
    [consents, createPlan, initiate, navigate, profile, resumes, showToast],
  );

  return {
    trackAndOpenApply,
    isPending: initiate.isPending || createPlan.isPending,
  };
}
