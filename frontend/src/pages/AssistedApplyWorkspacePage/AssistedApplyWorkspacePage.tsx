import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  isWorkspaceEnabledClient,
  useAssistedApplyRolloutFlags,
} from '@/features/auto-apply/hooks/useAssistedApplyRolloutFlags';
import {
  useAssistedApplyWorkspace,
  useUpdateWorkspaceProgressStep,
} from '@/features/auto-apply/hooks/useAssistedApplyWorkspace';
import { useLatestJobAnalysis } from '@/features/auto-apply/hooks/useJobPageAnalysis';

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
  ChevronLeftIcon,
  Chip,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  MoreVertIcon,
  MuiButton,
  RefreshIcon,
  Stack,
  Typography,
  useMediaQuery,
} from '@/lib/material';
import { trackEvent } from '@/shared/analytics/trackEvent';

import { AbandonApplicationModal } from './AbandonApplicationModal';
import { ActivityTimelinePanel } from './ActivityTimelinePanel';
import { submissionCapabilityLabel } from './analysisRequirementViewModel';
import { AnalysisStep } from './AnalysisStep';
import { DoneStep } from './DoneStep';
import { FitStep } from './FitStep';
import { OpenApplicationStep } from './OpenApplicationStep';
import { ResumeAnalysisStep } from './ResumeAnalysisStep';
import { ResumeSelectionStep } from './ResumeSelectionStep';
import { assistedApplyWorkspaceSx } from './styles';
import { WorkspaceStepProgress } from './WorkspaceStepProgress';
import { assistedApplyTouchTargetSx } from './WorkspaceStickyActions';

const WORKSPACE_VITE_ENABLED = import.meta.env.VITE_ASSISTED_APPLY_WORKSPACE !== 'false';

export function AssistedApplyWorkspacePage() {
  const { jobApplicationId = '' } = useParams<{ jobApplicationId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const rolloutQuery = useAssistedApplyRolloutFlags();
  const workspaceEnabled = WORKSPACE_VITE_ENABLED && isWorkspaceEnabledClient(rolloutQuery.data);
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
  const [analysisReanalyze, setAnalysisReanalyze] = useState<{
    isPending: boolean;
    reanalyze: () => void;
  } | null>(null);
  const isCompactHeader = useMediaQuery('(max-width:899px)');

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

  const jobIdForAnalysis = workspaceQuery.data?.application.jobId ?? undefined;
  const latestAnalysisQuery = useLatestJobAnalysis(
    activeStep === 'analysis' ? jobIdForAnalysis : undefined,
  );
  const applicationModeLabel = submissionCapabilityLabel(
    latestAnalysisQuery.data?.submissionCapability ?? 'EXTERNAL_MANUAL',
  );

  const handleAnalysisControls = useCallback(
    (state: { isPending: boolean; reanalyze: () => void }) => {
      setAnalysisReanalyze(state);
    },
    [],
  );

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
      <Box sx={assistedApplyWorkspaceSx.root}>
        <LinearProgress aria-label="Loading Assisted Apply workspace" />
      </Box>
    );
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    return (
      <Box sx={assistedApplyWorkspaceSx.root}>
        <Typography sx={{ mb: 1 }} variant="h5">
          This application isn&apos;t available.
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          It may have been removed, or it belongs to a different account.
        </Typography>
        <MuiButton
          component={RouterLink}
          to={`${ROUTES.AUTO_APPLY}?tab=submissions`}
          variant="contained"
        >
          Back to your applications
        </MuiButton>
      </Box>
    );
  }

  const data = workspaceQuery.data;
  const jobId = data.application.jobId;
  const showDuplicate = !dismissedDuplicate && (entrySignals?.possibleDuplicateCount ?? 0) > 0;
  const showReopened =
    !dismissedReopened && (data.wasReopened || entrySignals?.wasReopened === true);

  const renderStepBody = () => {
    if (activeStep === 'analysis' && jobId) {
      return (
        <AnalysisStep
          company={data.application.companyName ?? data.application.company}
          jobApplicationId={jobApplicationId}
          jobId={jobId}
          jobTitle={data.application.jobTitle}
          onContinue={() => selectStep('fit')}
          onReanalyzeStateChange={handleAnalysisControls}
          viewLabel={data.viewLabel}
          workplaceMode={data.application.workplaceMode ?? null}
        />
      );
    }
    if (activeStep === 'fit' && jobId) {
      return (
        <FitStep
          applicationStatus={data.application.status}
          company={data.application.companyName ?? data.application.company}
          jobApplicationId={jobApplicationId}
          jobId={jobId}
          jobTitle={data.application.jobTitle}
          onBack={() => selectStep('analysis')}
          onContinue={() => selectStep('resume')}
          onRefresh={() => void workspaceQuery.refetch()}
          onSelectResume={() => selectStep('resume')}
          onViewDetails={() => selectStep('done')}
          profileMatch={data.fit?.profileMatch ?? null}
          profileMatchLoading={workspaceQuery.isFetching && !data.fit?.profileMatch}
          viewLabel={data.viewLabel}
          viewState={data.viewState}
          workplaceMode={data.application.workplaceMode ?? null}
        />
      );
    }
    if (activeStep === 'resume') {
      return (
        <Stack spacing={3}>
          <Box
            sx={{
              display: showSelectionFocus || !data.resume?.resumeVersionId ? 'block' : 'block',
            }}
          >
            <ResumeSelectionStep
              jobApplicationId={jobApplicationId}
              selectedResumeVersionId={data.resume?.resumeVersionId ?? null}
            />
          </Box>
          <ResumeAnalysisStep
            continueError={continueError}
            continuePending={progressMutation.isPending}
            jobId={jobId!}
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
          onAbandon={() => setAbandonOpen(true)}
        />
      );
    }
    if (activeStep === 'done') {
      return <DoneStep status={data.application.status} submittedAt={data.handoff?.submittedAt} />;
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
    <Box sx={assistedApplyWorkspaceSx.root}>
      {jobId ? (
        <MuiButton
          component={RouterLink}
          startIcon={<ChevronLeftIcon />}
          sx={{ ...assistedApplyTouchTargetSx, ...assistedApplyWorkspaceSx.backLink }}
          to={`/jobs/${jobId}`}
          variant="text"
        >
          Back to job
        </MuiButton>
      ) : null}

      <Stack
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={assistedApplyWorkspaceSx.pageHeader}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack
            alignItems="center"
            direction="row"
            flexWrap="wrap"
            spacing={1}
            sx={assistedApplyWorkspaceSx.pageTitleRow}
          >
            <Typography component="h1" sx={assistedApplyWorkspaceSx.pageTitle} variant="h4">
              Assisted Apply
            </Typography>
            <Chip
              label={`Application mode: ${applicationModeLabel}`}
              size="small"
              sx={{ maxWidth: '100%' }}
              variant="outlined"
            />
          </Stack>
          <Typography
            color="text.secondary"
            sx={assistedApplyWorkspaceSx.pageSubtitle}
            variant="subtitle1"
          >
            {data.application.jobTitle ?? 'Job'}
            {(data.application.companyName ?? data.application.company)
              ? ` · ${data.application.companyName ?? data.application.company}`
              : ''}
          </Typography>
          <Typography color="success.main" fontWeight={600} sx={{ mt: 0.5 }} variant="body2">
            {data.viewLabel}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={assistedApplyWorkspaceSx.headerActions}>
          {activeStep === 'analysis' ? (
            <MuiButton
              disabled={!analysisReanalyze || analysisReanalyze.isPending}
              onClick={() => analysisReanalyze?.reanalyze()}
              startIcon={<RefreshIcon />}
              sx={{ ...assistedApplyTouchTargetSx, display: { xs: 'none', md: 'inline-flex' } }}
              variant="outlined"
            >
              {analysisReanalyze?.isPending ? 'Reanalyzing…' : 'Reanalyze'}
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
            anchorOrigin={{
              horizontal: 'right',
              vertical: isCompactHeader ? 'top' : 'bottom',
            }}
            id="assisted-workspace-actions-menu"
            onClose={() => setMenuAnchor(null)}
            open={Boolean(menuAnchor)}
            slotProps={{
              paper: {
                sx: assistedApplyWorkspaceSx.workspaceActionsMenuPaper,
              },
            }}
            transformOrigin={{
              horizontal: 'right',
              vertical: isCompactHeader ? 'bottom' : 'top',
            }}
          >
            {activeStep === 'analysis' ? (
              <MenuItem
                disabled={!analysisReanalyze || analysisReanalyze.isPending}
                onClick={() => {
                  setMenuAnchor(null);
                  analysisReanalyze?.reanalyze();
                }}
                sx={{ display: { xs: 'flex', md: 'none' }, py: 1.25 }}
              >
                {analysisReanalyze?.isPending ? 'Reanalyzing…' : 'Reanalyze'}
              </MenuItem>
            ) : null}
            <MenuItem
              disabled={data.viewState === 'APPLIED' || data.viewState === 'ABANDONED'}
              onClick={() => {
                setMenuAnchor(null);
                setAbandonOpen(true);
              }}
              sx={{
                color: 'error.main',
                py: 1.25,
                whiteSpace: 'normal',
              }}
            >
              Stop tracking application
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
        <Alert onClose={() => setDismissedReopened(true)} severity="info" sx={{ mb: 2 }}>
          You previously withdrew this application. We&apos;ve reopened it — some details may need
          review.
        </Alert>
      ) : null}

      <WorkspaceStepProgress activeStep={activeStep} onSelect={selectStep} steps={steps} />

      {activeStep === 'analysis' ? (
        <Box aria-live="polite" sx={{ minWidth: 0, maxWidth: '100%', overflowX: 'hidden' }}>
          {renderStepBody()}
        </Box>
      ) : (
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={2}
          sx={assistedApplyWorkspaceSx.stepLayout}
        >
          <Box aria-live="polite" sx={assistedApplyWorkspaceSx.stepContentShell}>
            {renderStepBody()}
          </Box>
          {jobApplicationId ? (
            <Box sx={assistedApplyWorkspaceSx.timelineAside}>
              <ActivityTimelinePanel jobApplicationId={jobApplicationId} />
            </Box>
          ) : null}
        </Stack>
      )}
    </Box>
  );
}
