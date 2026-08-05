import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useCreatePlan } from '@/features/auto-apply/hooks/usePlan';
import { usePrepareApplication } from '@/features/auto-apply/hooks/usePrepareApplication';
import { useSetupStatus } from '@/features/auto-apply/hooks/useSetupStatus';
import { useInitiateSubmission } from '@/features/auto-apply/hooks/useSubmissions';

import { ROUTES, assistedApplyWorkspacePath } from '@/constants/routes';
import {
  existingApplicationIdFromError,
  isAutoApplyClientError,
} from '@/features/auto-apply/utils/apiError';
import { storeWorkspaceEntrySignals } from '@/features/auto-apply/utils/assistedApplyWorkspace';
import {
  buildSetupGapToastMessage,
  destinationToSetupHref,
  resolveSetupGapFixActions,
} from '@/pages/AutoApplyPage/missingFieldNavigation';

const WORKSPACE_ENABLED = import.meta.env.VITE_ASSISTED_APPLY_WORKSPACE !== 'false';

export interface TrackAndOpenApplyInput {
  jobId: string | null | undefined;
  applyUrl?: string | null;
  /** @deprecated AA-041 navigates to workspace; ignored when workspace flag is on. */
  navigateToSubmissions?: boolean;
  /**
   * Must never be true on the Assisted Apply CTA path (AA-041).
   * External open belongs to "Apply Now" only.
   */
  openExternal?: boolean;
  applyMode?: 'PREPARE' | 'ASSISTED';
}

export interface TrackAndOpenApplyResult {
  tracked: boolean;
  alreadyTracked: boolean;
  openedExternal: boolean;
  setupIncomplete?: boolean;
  jobApplicationId?: string;
}

/**
 * AA-041: start/reopen tracking, prepare (non-blocking on failure), open workspace.
 * Never opens an external employer tab on this path.
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
      if (input.openExternal === true) {
        if (import.meta.env.DEV) {
          throw new Error(
            'useTrackAndOpenApply must not be called with openExternal: true (AA-041)',
          );
        }
      }

      if (!input.jobId) {
        showToast({
          message: 'Something went wrong. Try again.',
          severity: 'error',
        });
        return { tracked: false, alreadyTracked: false, openedExternal: false };
      }

      const applyMode = input.applyMode ?? 'ASSISTED';
      const setupStatus = setupStatusQuery.data;
      if (setupStatus && !setupStatus.readyForAssistedApply) {
        const fixActions = resolveSetupGapFixActions(setupStatus.gaps);
        const firstAction = fixActions[0];
        const href = firstAction
          ? destinationToSetupHref(firstAction.destination)
          : ROUTES.AUTO_APPLY;

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

      const goToWorkspace = (
        jobApplicationId: string,
        signals: { possibleDuplicateCount: number; wasReopened: boolean },
      ) => {
        storeWorkspaceEntrySignals(jobApplicationId, signals);
        if (WORKSPACE_ENABLED) {
          void navigate(assistedApplyWorkspacePath(jobApplicationId));
        } else if (input.navigateToSubmissions !== false) {
          void navigate(`${ROUTES.AUTO_APPLY}?tab=submissions`);
        }
      };

      try {
        const result = await initiate.mutateAsync(input.jobId);
        const trackedJobId = result.application.jobId ?? input.jobId;
        let prepareFailed = false;

        try {
          await prepare.mutateAsync({
            jobId: trackedJobId,
            jobApplicationId: result.application.id,
            applyMode,
          });
        } catch {
          prepareFailed = true;
        }

        if (trackedJobId) {
          try {
            await createPlan.mutateAsync(trackedJobId);
          } catch {
            prepareFailed = true;
          }
        }

        goToWorkspace(result.application.id, {
          possibleDuplicateCount: result.possibleDuplicates?.length ?? 0,
          wasReopened: result.wasReopened === true,
        });

        if (prepareFailed) {
          showToast({
            message:
              "We started tracking, but couldn't fully analyze this job yet. You can retry from the workspace.",
            severity: 'warning',
          });
        } else {
          showToast({
            message: 'Tracking started.',
            severity: 'success',
          });
        }

        return {
          tracked: true,
          alreadyTracked: false,
          openedExternal: false,
          jobApplicationId: result.application.id,
        };
      } catch (error) {
        const alreadyTracked =
          isAutoApplyClientError(error) && error.code === 'APPLICATION_EXISTS';
        const existingId = existingApplicationIdFromError(error);

        if (alreadyTracked && (existingId || input.jobId)) {
          let prepareFailed = false;
          try {
            await prepare.mutateAsync({
              jobId: input.jobId,
              jobApplicationId: existingId ?? undefined,
              applyMode,
            });
            await createPlan.mutateAsync(input.jobId);
          } catch {
            prepareFailed = true;
          }

          if (existingId) {
            goToWorkspace(existingId, {
              possibleDuplicateCount: 0,
              wasReopened: false,
            });
          } else {
            void navigate(`${ROUTES.AUTO_APPLY}?tab=submissions`);
          }

          if (prepareFailed) {
            showToast({
              message:
                "We started tracking, but couldn't fully analyze this job yet. You can retry from the workspace.",
              severity: 'warning',
            });
          }

          return {
            tracked: false,
            alreadyTracked: true,
            openedExternal: false,
            jobApplicationId: existingId ?? undefined,
          };
        }

        showToast({
          message:
            error instanceof Error ? error.message : 'Unable to start Assisted Apply for this job.',
          severity: 'error',
        });
        return { tracked: false, alreadyTracked: false, openedExternal: false };
      }
    },
    [createPlan, initiate, navigate, prepare, setupStatusQuery.data, showToast],
  );

  return {
    trackAndOpenApply,
    isPending: initiate.isPending || createPlan.isPending || prepare.isPending,
  };
}
