import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useSetupStatus } from '@/features/auto-apply/hooks/useSetupStatus';
import { useCreatePlan } from '@/features/auto-apply/hooks/usePlan';
import { usePrepareApplication } from '@/features/auto-apply/hooks/usePrepareApplication';
import { useInitiateSubmission } from '@/features/auto-apply/hooks/useSubmissions';

import { ROUTES } from '@/constants/routes';
import { isAutoApplyClientError } from '@/features/auto-apply/utils/apiError';
import { openExternalApply } from '@/features/jobs/utils/openExternalApply';
import {
  buildSetupGapToastMessage,
  destinationToSetupHref,
  resolveSetupGapFixActions,
} from '@/pages/AutoApplyPage/missingFieldNavigation';

export interface TrackAndOpenApplyInput {
  jobId: string | null | undefined;
  applyUrl?: string | null;
  /** When false, stay on the current page after tracking (default: navigate to Submissions). */
  navigateToSubmissions?: boolean;
  /** When true, also open the employer apply URL (default: false for Assisted Apply). */
  openExternal?: boolean;
  /**
   * Apply mode for Pre-Application Intelligence.
   * PREPARE = analyze + readiness; ASSISTED = same path used by Assisted Apply CTA.
   */
  applyMode?: 'PREPARE' | 'ASSISTED';
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
  const prepare = usePrepareApplication();
  const setupStatusQuery = useSetupStatus();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const trackAndOpenApply = useCallback(
    async (input: TrackAndOpenApplyInput): Promise<TrackAndOpenApplyResult> => {
      const shouldNavigate = input.navigateToSubmissions !== false;
      const shouldOpenExternal = input.openExternal === true;
      const applyMode = input.applyMode ?? 'ASSISTED';
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

      const setupStatus = setupStatusQuery.data;
      if (setupStatus && !setupStatus.readyForAssistedApply) {
        const fixActions = resolveSetupGapFixActions(setupStatus.gaps);
        const firstAction = fixActions[0];
        const href = firstAction ? destinationToSetupHref(firstAction.destination) : ROUTES.AUTO_APPLY;

        showToast({
          message: buildSetupGapToastMessage(fixActions),
          severity: 'warning',
          actionLabel: 'Fix now',
          onAction: () => {
            if (href) void navigate(href);
          },
          autoHideDuration: 8000,
        });

        if (href) void navigate(href);

        return {
          tracked: false,
          alreadyTracked: false,
          openedExternal: false,
          setupIncomplete: true,
        };
      }

      try {
        const result = await initiate.mutateAsync(input.jobId);
        const trackedJobId = result.application.jobId ?? input.jobId;

        try {
          await prepare.mutateAsync({
            jobId: trackedJobId,
            jobApplicationId: result.application.id,
            applyMode,
          });
        } catch {
          // Analysis may fail (fetch/SSRF); planner still runs with ANALYSIS_UNAVAILABLE warning.
        }

        if (trackedJobId) {
          try {
            await createPlan.mutateAsync(trackedJobId);
          } catch {
            // Submissions tab will retry auto-review.
          }
        }
        const openedExternal = shouldOpenExternal ? openExternalApply(input.applyUrl) : false;
        const hasDuplicates = result.possibleDuplicates.length > 0;

        showToast({
          message: hasDuplicates
            ? 'Assisted Apply started — a possible duplicate was detected. Continue in Submissions.'
            : applyMode === 'PREPARE'
              ? 'Application prepared. Review analysis and readiness in Submissions.'
              : 'Assisted Apply started. Application review is ready in Submissions.',
          severity: hasDuplicates ? 'warning' : 'success',
        });
        goToSubmissions();
        return { tracked: true, alreadyTracked: false, openedExternal };
      } catch (error) {
        const openedExternal = shouldOpenExternal ? openExternalApply(input.applyUrl) : false;
        const alreadyTracked = isAutoApplyClientError(error) && error.code === 'APPLICATION_EXISTS';

        if (alreadyTracked) {
          try {
            await prepare.mutateAsync({
              jobId: input.jobId,
              applyMode,
            });
            await createPlan.mutateAsync(input.jobId);
          } catch {
            // User can retry from Submissions.
          }
          showToast({
            message: 'This job is already tracked — refreshed preparation in Submissions.',
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
    [createPlan, initiate, navigate, prepare, setupStatusQuery.data, showToast],
  );

  return {
    trackAndOpenApply,
    isPending: initiate.isPending || createPlan.isPending || prepare.isPending,
  };
}
