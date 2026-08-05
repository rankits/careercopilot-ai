import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  useAssistedApplyWorkspace,
  useUpdateWorkspaceProgressStep,
} from '@/features/auto-apply/hooks/useAssistedApplyWorkspace';
import {
  isWorkspaceEnabledClient,
  useAssistedApplyRolloutFlags,
} from '@/features/auto-apply/hooks/useAssistedApplyRolloutFlags';

import { ROUTES } from '@/constants/routes';
import type { WorkspaceStepId } from '@/features/auto-apply/types/autoApply.types';
import {
  clearWorkspaceEntryDuplicateSignal,
  isWorkspaceStepEnabled,
  readWorkspaceEntrySignals,
  resolveInitialWorkspaceStep,
} from '@/features/auto-apply/utils/assistedApplyWorkspace';
import {
  Alert,
  Box,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  MoreVertIcon,
  MuiButton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@/lib/material';
import { trackEvent } from '@/shared/analytics/trackEvent';

import { AbandonApplicationModal } from './AbandonApplicationModal';
import { ActivityTimelinePanel } from './ActivityTimelinePanel';
import { AnalysisStep } from './AnalysisStep';
import { FitStep } from './FitStep';
import { OpenApplicationStep } from './OpenApplicationStep';
import { ResumeAnalysisStep } from './ResumeAnalysisStep';
import { ResumeSelectionStep } from './ResumeSelectionStep';
import { assistedApplyTouchTargetSx } from './WorkspaceStickyActions';

const WORKSPACE_VITE_ENABLED = import.meta.env.VITE_ASSISTED_APPLY_WORKSPACE !== 'false';

export function AssistedApplyWorkspacePage() {
  const { jobApplicationId = '' } = useParams<{ jobApplicationId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const rolloutQuery = useAssistedApplyRolloutFlags();
  const workspaceEnabled =
    WORKSPACE_VITE_ENABLED && isWorkspaceEnabledClient(rolloutQuery.data);
  const workspaceQuery = useAssistedApplyWorkspace(
    workspaceEnabled ? jobApplicationId || undefined : undefined,
  );
  const progressMutation = useUpdateWorkspaceProgressStep(jobApplicationId || undefined);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [dismissedDuplicate, setDismissedDuplicate] = useState(false);
  const [dismissedReopened, setDismissedReopened] = useState(false);

  const [continueError, setContinueError] = useState<string | null>(null);
  const [showSelectionFocus, setShowSelectionFocus] = useState(false);

  const entrySignals = useMemo(
    () => (jobApplicationId ? readWorkspaceEntrySignals(jobApplicationId) : null),
    [jobApplicationId],
  );

  const steps = workspaceQuery.data?.steps ?? [];
  const activeStep = useMemo(() => {
    if (!workspaceQuery.data) return 'analysis';
    return resolveInitialWorkspaceStep({
      steps: workspaceQuery.data.steps,
      explicitStep: searchParams.get('step'),
      progressStep: workspaceQuery.data.progressStep,
    });
  }, [workspaceQuery.data, searchParams]);

  useEffect(() => {
    if (!workspaceEnabled && !rolloutQuery.isLoading) {
      void navigate(`${ROUTES.AUTO_APPLY}?tab=submissions`, { replace: true });
    }
  }, [navigate, workspaceEnabled, rolloutQuery.isLoading]);

  useEffect(() => {
    if (!jobApplicationId || !workspaceQuery.data) return;
    trackEvent('workspace_step_viewed', {
      job_application_id: jobApplicationId,
      step: activeStep,
    });
  }, [jobApplicationId, activeStep, workspaceQuery.data]);

  const selectStep = (stepId: WorkspaceStepId) => {
    if (!isWorkspaceStepEnabled(steps, stepId)) return;
    const next = new URLSearchParams(searchParams);
    next.set('step', stepId);
    setSearchParams(next, { replace: true });
    progressMutation.mutate(stepId);
  };

  if (workspaceQuery.isLoading) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <LinearProgress aria-label="Loading Assisted Apply workspace" />
      </Box>
    );
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Typography sx={{ mb: 1 }} variant="h5">
          This application isn&apos;t available.
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          It may have been removed, or it belongs to a different account.
        </Typography>
        <MuiButton component={RouterLink} to={`${ROUTES.AUTO_APPLY}?tab=submissions`} variant="contained">
          Back to your applications
        </MuiButton>
      </Box>
    );
  }

  const data = workspaceQuery.data;
  const jobId = data.application.jobId;
  const showDuplicate =
    !dismissedDuplicate && (entrySignals?.possibleDuplicateCount ?? 0) > 0;
  const showReopened =
    !dismissedReopened && (data.wasReopened || entrySignals?.wasReopened === true);

  const renderStepBody = () => {
    if (activeStep === 'analysis' && jobId) {
      return <AnalysisStep jobId={jobId} />;
    }
    if (activeStep === 'fit' && jobId) {
      return (
        <FitStep
          jobApplicationId={jobApplicationId}
          jobId={jobId}
          onContinue={() => selectStep('resume')}
        />
      );
    }
    if (activeStep === 'resume') {
      return (
        <Stack spacing={3}>
          <Box sx={{ display: showSelectionFocus || !data.resume?.resumeVersionId ? 'block' : 'block' }}>
            <ResumeSelectionStep
              jobApplicationId={jobApplicationId}
              selectedResumeVersionId={data.resume?.resumeVersionId ?? null}
            />
          </Box>
          <ResumeAnalysisStep
            continueError={continueError}
            continuePending={progressMutation.isPending}
            jobApplicationId={jobApplicationId}
            onContinue={() => {
              setContinueError(null);
              progressMutation.mutate('open', {
                onSuccess: () => {
                  const next = new URLSearchParams(searchParams);
                  next.set('step', 'open');
                  setSearchParams(next, { replace: true });
                },
                onError: () => setContinueError("Couldn't continue. Try again."),
              });
            }}
            onSelectAnother={() => setShowSelectionFocus(true)}
            selectedResumeVersionId={data.resume?.resumeVersionId ?? null}
          />
        </Stack>
      );
    }
    if (activeStep === 'open' && jobId) {
      return (
        <OpenApplicationStep
          applyUrl={data.handoff?.externalConfirmationUrl ?? null}
          jobApplicationId={jobApplicationId}
          jobId={jobId}
          openedAt={data.handoff?.openedAt ?? null}
          viewState={data.viewState}
        />
      );
    }
    return (
      <>
        <Typography sx={{ mb: 1 }} variant="h6">
          {steps.find((s) => s.id === activeStep)?.label ?? 'Step'}
        </Typography>
        <Typography color="text.secondary">
          This step&apos;s full content ships in a follow-up ticket. You can move between enabled
          steps here.
        </Typography>
      </>
    );
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        maxWidth: '100%',
        overflowX: 'hidden',
        pb: { xs: 10, md: 4 },
      }}
    >
      <Stack
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h4">{data.application.jobTitle ?? 'Assisted Apply'}</Typography>
          <Typography color="text.secondary" variant="subtitle1">
            {data.application.company ?? 'Company'}
          </Typography>
          <Typography sx={{ mt: 0.5 }} variant="body2">
            {data.viewLabel}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {jobId ? (
            <MuiButton component={RouterLink} to={`/jobs/${jobId}`} variant="outlined">
              Back to job
            </MuiButton>
          ) : null}
          <IconButton
            aria-label="More application actions"
            onClick={(event) => setMenuAnchor(event.currentTarget)}
            sx={assistedApplyTouchTargetSx}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            onClose={() => setMenuAnchor(null)}
            open={Boolean(menuAnchor)}
          >
            <MenuItem
              disabled={data.viewState === 'APPLIED' || data.viewState === 'ABANDONED'}
              onClick={() => {
                setMenuAnchor(null);
                setAbandonOpen(true);
              }}
            >
              Abandon
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <AbandonApplicationModal
        jobApplicationId={jobApplicationId}
        onClose={() => setAbandonOpen(false)}
        open={abandonOpen}
      />

      {showDuplicate ? (
        <Alert
          onClose={() => {
            setDismissedDuplicate(true);
            clearWorkspaceEntryDuplicateSignal(jobApplicationId);
          }}
          severity="warning"
          sx={{ mb: 2 }}
        >
          This looks similar to {entrySignals!.possibleDuplicateCount} other application(s)
          you&apos;re tracking.
        </Alert>
      ) : null}

      {showReopened ? (
        <Alert
          onClose={() => setDismissedReopened(true)}
          severity="info"
          sx={{ mb: 2 }}
        >
          You previously withdrew this application. We&apos;ve reopened it — some details may need
          review.
        </Alert>
      ) : null}

      <Tabs
        allowScrollButtonsMobile
        aria-label="Assisted Apply steps"
        onChange={(_e, value: WorkspaceStepId) => selectStep(value)}
        scrollButtons="auto"
        sx={{
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          maxWidth: '100%',
          '& .MuiTab-root': {
            minHeight: 48,
            minWidth: 72,
            px: { xs: 1, sm: 2 },
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
          },
        }}
        value={activeStep}
        variant="scrollable"
      >
        {steps.map((step) => {
          const enabled = isWorkspaceStepEnabled(steps, step.id);
          const label = `${step.complete ? '✓ ' : ''}${step.label}`;
          const tab = (
            <Tab disabled={!enabled} key={step.id} label={label} value={step.id} />
          );
          if (enabled) return tab;
          const previous = steps[steps.findIndex((s) => s.id === step.id) - 1];
          return (
            <Tooltip
              key={step.id}
              title={previous ? `Complete ${previous.label} first.` : 'Complete the previous step first.'}
            >
              <span>{tab}</span>
            </Tooltip>
          );
        })}
      </Tabs>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ alignItems: 'stretch' }}
      >
        <Box
          aria-live="polite"
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: { xs: 2, sm: 3 },
            minHeight: 200,
            flex: 1,
            minWidth: 0,
            maxWidth: '100%',
            overflowX: 'hidden',
          }}
        >
          {renderStepBody()}
        </Box>
        {jobApplicationId ? <ActivityTimelinePanel jobApplicationId={jobApplicationId} /> : null}
      </Stack>
    </Box>
  );
}
