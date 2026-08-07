import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useApplicationReadiness } from '@/features/auto-apply/hooks/useApplicationReadiness';
import {
  useHandoffApplication,
  useMarkApplied,
} from '@/features/auto-apply/hooks/useResumeHandoff';

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
import { assistedApplyTouchTargetSx, WorkspaceStickyActions } from './WorkspaceStickyActions';

const HANDOFF_ENABLED = import.meta.env.VITE_ASSISTED_APPLY_DIRECT_HANDOFF !== 'false';

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
  const [appliedOn, setAppliedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  if (!HANDOFF_ENABLED) {
    return (
      <Alert severity="info">Opening the employer application page from here is coming soon.</Alert>
    );
  }

  if (readinessQuery.isLoading) {
    return (
      <Stack alignItems="center" direction="row" spacing={1.5} sx={{ py: 2 }}>
        <CircularProgress size={20} />
        <Typography>Checking whether you can open this application…</Typography>
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
    <Stack spacing={2}>
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
            <Stack direction="row" spacing={1}>
              <MuiButton
                component="a"
                href={popupBlockedUrl}
                rel="noopener noreferrer"
                size="small"
                target="_blank"
                variant="outlined"
              >
                Open manually
              </MuiButton>
              <MuiButton onClick={() => void handleCopy()} size="small" variant="text">
                {copied ? 'Copied!' : 'Copy link'}
              </MuiButton>
            </Stack>
          }
          severity="warning"
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
              onClick={handleOpen}
              sx={assistedApplyTouchTargetSx}
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
            <Stack direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" spacing={1}>
              <MuiButton onClick={handleOpen} sx={assistedApplyTouchTargetSx} variant="outlined">
                Open employer website again
              </MuiButton>
              <MuiButton
                onClick={() => setMarkOpen(true)}
                sx={assistedApplyTouchTargetSx}
                variant="contained"
              >
                I submitted the application
              </MuiButton>
              <MuiButton
                onClick={() => {
                  trackEvent('could_not_apply_clicked', { job_application_id: jobApplicationId });
                  if (onAbandon) {
                    onAbandon();
                  }
                }}
                sx={assistedApplyTouchTargetSx}
                variant="outlined"
                color="error"
              >
                I could not apply
              </MuiButton>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <MuiButton
                onClick={() => {
                  trackEvent('return_later_clicked', { job_application_id: jobApplicationId });
                  showToast({
                    message: 'You can come back anytime to mark this as applied.',
                    severity: 'info',
                  });
                  void navigate(`${ROUTES.AUTO_APPLY}?tab=submissions`);
                }}
                sx={assistedApplyTouchTargetSx}
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
        onClose={() => setMarkOpen(false)}
        open={markOpen}
      >
        <DialogTitle id="mark-applied-title">Mark this application as applied?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: { sm: 360 } }}>
            <TextField
              InputLabelProps={{ shrink: true }}
              fullWidth
              label="Applied on"
              onChange={(e) => setAppliedOn(e.target.value)}
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
        <DialogActions>
          <MuiButton onClick={() => setMarkOpen(false)}>Cancel</MuiButton>
          <MuiButton
            disabled={markAppliedMutation.isPending}
            onClick={handleMarkConfirm}
            variant="contained"
          >
            Confirm
          </MuiButton>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
