import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useInitiateSubmission } from '@/features/auto-apply/hooks/useSubmissions';

import { ROUTES } from '@/constants/routes';
import { isAutoApplyClientError } from '@/features/auto-apply/utils/apiError';
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
}

/**
 * Starts Auto Apply tracking for a platform job and sends the user to
 * Auto Apply → Submissions (Assisted Apply entry point).
 */
export function useTrackAndOpenApply() {
  const initiate = useInitiateSubmission();
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

      if (!input.jobId) {
        const openedExternal = shouldOpenExternal ? openExternalApply(input.applyUrl) : false;
        showToast({
          message: 'Unable to start Assisted Apply — this listing has no job ID.',
          severity: 'warning',
        });
        return { tracked: false, alreadyTracked: false, openedExternal };
      }

      try {
        const result = await initiate.mutateAsync(input.jobId);
        const openedExternal = shouldOpenExternal ? openExternalApply(input.applyUrl) : false;
        const hasDuplicates = result.possibleDuplicates.length > 0;

        showToast({
          message: hasDuplicates
            ? 'Assisted Apply started — a possible duplicate was detected. Continue in Submissions.'
            : 'Assisted Apply started. Generate a plan in Auto Apply → Submissions.',
          severity: hasDuplicates ? 'warning' : 'success',
        });
        goToSubmissions();
        return { tracked: true, alreadyTracked: false, openedExternal };
      } catch (error) {
        const openedExternal = shouldOpenExternal ? openExternalApply(input.applyUrl) : false;
        const alreadyTracked = isAutoApplyClientError(error) && error.code === 'APPLICATION_EXISTS';

        if (alreadyTracked) {
          showToast({
            message: 'Already tracking this job. Opening Auto Apply → Submissions.',
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
    [initiate, navigate, showToast],
  );

  return {
    trackAndOpenApply,
    isPending: initiate.isPending,
  };
}
