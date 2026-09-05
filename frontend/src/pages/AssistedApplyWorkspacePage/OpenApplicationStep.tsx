import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useApplicationReadiness } from '@/features/auto-apply/hooks/useApplicationReadiness';
import {
  useHandoffApplication,
  useMarkApplied,
} from '@/features/auto-apply/hooks/useResumeHandoff';

import { getTodayDateInputValue } from '@/constants/pages/addApplication';
import { ROUTES } from '@/constants/routes';
import { isAutoApplyClientError } from '@/features/auto-apply/utils/apiError';
import { openExternalApply, toSafeApplyUrl } from '@/features/jobs/utils/openExternalApply';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MuiButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@/lib/material';
import { trackEvent } from '@/shared/analytics/trackEvent';

import { formatRelativeTime } from './activityLabels';
import { assistedApplyWorkspaceSx } from './styles';
import { assistedApplyTouchTargetSx, WorkspaceStickyActions } from './WorkspaceStickyActions';

const HANDOFF_ENABLED = import.meta.env.VITE_ASSISTED_APPLY_DIRECT_HANDOFF !== 'false';
const maxAppliedDate = getTodayDateInputValue();

export interface OpenApplicationStepProps {
  jobId: string;
  jobApplicationId: string;
  openedAt: string | null;
  applyUrl: string | null;
  viewState?: string;
  onAbandon?: () => void;
}

export function OpenApplicationStep({
  jobId,
  jobApplicationId,
  openedAt,
  applyUrl,
  viewState,
  onAbandon,
}: OpenApplicationStepProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const readinessQuery = useApplicationReadiness(jobId, 'HANDOFF', jobApplicationId);
  const handoffMutation = useHandoffApplication(jobApplicationId);
  const markAppliedMutation = useMarkApplied(jobApplicationId);

  const [localError, setLocalError] = useState<string | null>(null);
  const [popupBlockedUrl, setPopupBlockedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);
  const [appliedOn, setAppliedOn] = useState(() => getTodayDateInputValue());
  const [notes, setNotes] = useState('');

  if (!HANDOFF_ENABLED) {
    return (
      <Alert severity="info">Opening the employer application page from here is coming soon.</Alert>
    );
  }

  if (readinessQuery.isLoading) {
    return (
      <Stack
        alignItems={{ sm: 'center' }}
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ py: 2, ...assistedApplyWorkspaceSx.stepRoot }}
      >
        <CircularProgress size={20} />
        <Typography sx={assistedApplyWorkspaceSx.overflowWrap}>
          Checking whether you can open this application…
        </Typography>
      </Stack>
    );
  }

  const blocking = readinessQuery.data?.blockingReasons ?? [];
  const blocked = blocking.length > 0;
  const alreadyOpened = Boolean(openedAt);
  const isApplied = viewState === 'APPLIED';
  const blockMessage = blocking[0]?.message ?? 'Resolve the blocking items first.';
  const effectiveApplyUrl = applyUrl ?? popupBlockedUrl;

  const tryOpen = (url: string) => {
    const safe = toSafeApplyUrl(url);
    if (!safe) {
      setLocalError('This apply link looks invalid.');
      return false;
    }
    const ok = openExternalApply(safe);
    if (!ok) {
      setPopupBlockedUrl(safe);
      trackEvent('popup_blocked', { job_application_id: jobApplicationId });
    }
    return ok;
  };

  const handleOpen = () => {
    setLocalError(null);
    if (alreadyOpened && applyUrl) {
      tryOpen(applyUrl);
      return;
    }
    handoffMutation.mutate(undefined, {
      onSuccess: (result) => {
        trackEvent('handoff_opened', { job_application_id: jobApplicationId });
        tryOpen(result.applyUrl);
      },
      onError: (error) => {
        if (isAutoApplyClientError(error) && error.code === 'HANDOFF_BLOCKED') {
          const reasons = (
            error.data as { reasons?: Array<{ message: string; code?: string }> } | undefined
          )?.reasons;
          const reasonText = reasons?.map((r) => r.message).join(' ') ?? error.message;
          trackEvent('handoff_blocked', {
            job_application_id: jobApplicationId,
            reason_codes:
              reasons
                ?.map((r) => r.code)
                .filter(Boolean)
                .join(',') || 'unknown',
          });
          setLocalError(`This application can't be opened right now: ${reasonText}`);
          return;
        }
        setLocalError(error instanceof Error ? error.message : 'Could not open application.');
      },
    });
  };

  const handleCopy = async () => {
    if (!effectiveApplyUrl) return;
    try {
      await navigator.clipboard.writeText(effectiveApplyUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setLocalError('Could not copy the link.');
    }
  };

  const handleMarkConfirm = () => {
    if (appliedOn > maxAppliedDate) {
      showToast({ message: 'Applied date cannot be in the future.', severity: 'error' });
      return;
    }

    markAppliedMutation.mutate(
      { appliedAt: appliedOn, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setMarkOpen(false);
          trackEvent('mark_applied', { job_application_id: jobApplicationId });
          showToast({ message: 'Marked as applied.', severity: 'success' });
        },
        onError: (error) => {
          trackEvent('mark_applied_failed', { job_application_id: jobApplicationId });
          showToast({
            message: error instanceof Error ? error.message : 'Could not mark as applied.',
            severity: 'error',
          });
        },
      },
    );
  };

  return (
    <Stack spacing={2} sx={assistedApplyWorkspaceSx.stepRoot}>
      <Typography variant="h6">Open application</Typography>
      <Typography color="text.secondary" variant="body2">
        We&apos;ll open the employer&apos;s application page in a new tab. Career Copilot does not
        fill or submit the form for you.
      </Typography>

      {isApplied ? <Alert severity="success">Marked as applied.</Alert> : null}

      {alreadyOpened && openedAt && !isApplied ? (
        <Alert severity="success">Application opened {formatRelativeTime(openedAt)}</Alert>
      ) : null}

      {localError ? <Alert severity="error">{localError}</Alert> : null}

      {popupBlockedUrl ? (
        <Alert
          action={
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              <MuiButton
                component="a"
                fullWidth
                href={popupBlockedUrl}
                rel="noopener noreferrer"
                size="small"
                sx={assistedApplyWorkspaceSx.fullWidthMobileButton}
                target="_blank"
                variant="outlined"
              >
                Open manually
              </MuiButton>
              <MuiButton
                fullWidth
                onClick={() => void handleCopy()}
                size="small"
                sx={assistedApplyWorkspaceSx.fullWidthMobileButton}
                variant="text"
              >
                {copied ? 'Copied!' : 'Copy link'}
              </MuiButton>
            </Stack>
          }
          severity="warning"
          sx={assistedApplyWorkspaceSx.alertWithAction}
        >
          Your browser blocked the new tab. Use the link below to continue on the employer&apos;s
          site.
        </Alert>
      ) : null}

      <WorkspaceStickyActions>
        <Box>
          {blocked && !alreadyOpened ? (
            <Tooltip title={blockMessage}>
              <span>
                <MuiButton disabled sx={assistedApplyTouchTargetSx} variant="contained">
                  Continue manually
                </MuiButton>
              </span>
            </Tooltip>
          ) : !alreadyOpened ? (
            <MuiButton
              disabled={handoffMutation.isPending || isApplied}
              fullWidth
              onClick={handleOpen}
              sx={{
                ...assistedApplyTouchTargetSx,
                ...assistedApplyWorkspaceSx.fullWidthMobileButton,
              }}
              variant="contained"
            >
              {handoffMutation.isPending ? 'Opening…' : 'Continue manually'}
            </MuiButton>
          ) : null}
        </Box>

        {alreadyOpened && !isApplied ? (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Action required
            </Typography>
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              flexWrap="wrap"
              spacing={1.25}
              sx={assistedApplyWorkspaceSx.stackedActionButtons}
            >
              <MuiButton
                fullWidth
                onClick={handleOpen}
                sx={{
                  ...assistedApplyTouchTargetSx,
                  ...assistedApplyWorkspaceSx.fullWidthMobileButton,
                }}
                variant="outlined"
              >
                Open employer website again
              </MuiButton>
              <MuiButton
                fullWidth
                onClick={() => setMarkOpen(true)}
                sx={{
                  ...assistedApplyTouchTargetSx,
                  ...assistedApplyWorkspaceSx.fullWidthMobileButton,
                }}
                variant="contained"
              >
                I submitted the application
              </MuiButton>
              <MuiButton
                color="error"
                fullWidth
                onClick={() => {
                  trackEvent('could_not_apply_clicked', { job_application_id: jobApplicationId });
                  if (onAbandon) {
                    onAbandon();
                  }
                }}
                sx={{
                  ...assistedApplyTouchTargetSx,
                  ...assistedApplyWorkspaceSx.fullWidthMobileButton,
                }}
                variant="outlined"
              >
                I could not apply
              </MuiButton>
            </Stack>
            <Stack direction="row" flexWrap="wrap" spacing={1} sx={{ mt: 1 }}>
              <MuiButton
                fullWidth
                onClick={() => {
                  trackEvent('return_later_clicked', { job_application_id: jobApplicationId });
                  showToast({
                    message: 'You can come back anytime to mark this as applied.',
                    severity: 'info',
                  });
                  void navigate(`${ROUTES.AUTO_APPLY}?tab=submissions`);
                }}
                sx={{
                  ...assistedApplyTouchTargetSx,
                  ...assistedApplyWorkspaceSx.fullWidthMobileButton,
                }}
                variant="text"
              >
                Return later
              </MuiButton>
            </Stack>
          </Box>
        ) : null}
      </WorkspaceStickyActions>

      {/* AA-072 mark as applied */}
      <Dialog
        aria-labelledby="mark-applied-title"
        fullWidth
        maxWidth="sm"
        onClose={() => setMarkOpen(false)}
        open={markOpen}
      >
        <DialogTitle id="mark-applied-title">Mark this application as applied?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 0, width: '100%' }}>
            <TextField
              InputLabelProps={{ shrink: true }}
              fullWidth
              inputProps={{ max: maxAppliedDate }}
              label="Applied on"
              onChange={(e) => {
                const value = e.target.value;
                if (value && value > maxAppliedDate) return;
                setAppliedOn(value);
              }}
              type="date"
              value={appliedOn}
            />
            <TextField
              fullWidth
              label="Notes (optional)"
              multiline
              minRows={3}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything you want to remember about this application?"
              value={notes}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={assistedApplyWorkspaceSx.dialogActions}>
          <MuiButton
            fullWidth
            onClick={() => setMarkOpen(false)}
            sx={assistedApplyWorkspaceSx.fullWidthMobileButton}
          >
            Cancel
          </MuiButton>
          <MuiButton
            disabled={markAppliedMutation.isPending || appliedOn > maxAppliedDate}
            fullWidth
            onClick={handleMarkConfirm}
            sx={assistedApplyWorkspaceSx.fullWidthMobileButton}
            variant="contained"
          >
            Confirm
          </MuiButton>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
