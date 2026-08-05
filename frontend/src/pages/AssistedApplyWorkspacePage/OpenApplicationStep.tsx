import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApplicationReadiness } from '@/features/auto-apply/hooks/useApplicationReadiness';
import {
  useHandoffApplication,
  useMarkApplied,
  useReportBrokenLink,
} from '@/features/auto-apply/hooks/useResumeHandoff';
import { isAutoApplyClientError } from '@/features/auto-apply/utils/apiError';
import { openExternalApply, toSafeApplyUrl } from '@/features/jobs/utils/openExternalApply';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/components/organisms/Toast/ToastContext';
import { formatRelativeTime } from './activityLabels';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MuiButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@/lib/material';

const HANDOFF_ENABLED = import.meta.env.VITE_ASSISTED_APPLY_DIRECT_HANDOFF !== 'false';

export interface OpenApplicationStepProps {
  jobId: string;
  jobApplicationId: string;
  openedAt: string | null;
  applyUrl: string | null;
  viewState?: string;
}

export function OpenApplicationStep({
  jobId,
  jobApplicationId,
  openedAt,
  applyUrl,
  viewState,
}: OpenApplicationStepProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const readinessQuery = useApplicationReadiness(jobId, 'HANDOFF', jobApplicationId);
  const handoffMutation = useHandoffApplication(jobApplicationId);
  const markAppliedMutation = useMarkApplied(jobApplicationId);
  const reportMutation = useReportBrokenLink(jobApplicationId);

  const [localError, setLocalError] = useState<string | null>(null);
  const [popupBlockedUrl, setPopupBlockedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);
  const [appliedOn, setAppliedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  if (!HANDOFF_ENABLED) {
    return (
      <Alert severity="info">
        Opening the employer application page from here is coming soon.
      </Alert>
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
        tryOpen(result.applyUrl);
      },
      onError: (error) => {
        if (isAutoApplyClientError(error) && error.code === 'HANDOFF_BLOCKED') {
          const reasons = (error.data as { reasons?: Array<{ message: string }> } | undefined)
            ?.reasons;
          const reasonText = reasons?.map((r) => r.message).join(' ') ?? error.message;
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
          showToast({ message: 'Marked as applied.', severity: 'success' });
        },
        onError: (error) => {
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

      <Box>
        {blocked && !alreadyOpened ? (
          <Tooltip title={blockMessage}>
            <span>
              <MuiButton disabled variant="contained">
                Open application
              </MuiButton>
            </span>
          </Tooltip>
        ) : (
          <MuiButton
            disabled={handoffMutation.isPending || isApplied}
            onClick={handleOpen}
            variant="contained"
          >
            {handoffMutation.isPending
              ? 'Opening…'
              : alreadyOpened
                ? 'Reopen application page'
                : 'Open application'}
          </MuiButton>
        )}
      </Box>

      {alreadyOpened && !isApplied ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" spacing={1}>
          <MuiButton onClick={() => setMarkOpen(true)} variant="contained">
            Mark as applied
          </MuiButton>
          <MuiButton
            onClick={() => {
              showToast({
                message: 'You can come back anytime to mark this as applied.',
                severity: 'info',
              });
              void navigate(`${ROUTES.AUTO_APPLY}?tab=submissions`);
            }}
            variant="outlined"
          >
            Return later
          </MuiButton>
          <MuiButton
            disabled={reportMutation.isPending}
            onClick={() => {
              reportMutation.mutate(undefined, {
                onSuccess: () => {
                  showToast({ message: 'Thanks — we recorded this.', severity: 'success' });
                },
              });
            }}
            variant="text"
          >
            Report broken link
          </MuiButton>
        </Stack>
      ) : null}

      {/* AA-071 popup blocked recovery */}
      <Dialog open={Boolean(popupBlockedUrl)} onClose={() => setPopupBlockedUrl(null)}>
        <DialogTitle>Your browser blocked the new tab</DialogTitle>
        <DialogContent>
          <DialogContentText>
            We&apos;ve already recorded that you opened this application. Use the link below to
            continue on the employer&apos;s site.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {effectiveApplyUrl ? (
            <MuiButton
              component="a"
              href={effectiveApplyUrl}
              rel="noopener noreferrer"
              target="_blank"
              variant="contained"
            >
              Open manually
            </MuiButton>
          ) : null}
          <MuiButton onClick={() => void handleCopy()} variant="outlined">
            {copied ? 'Copied!' : 'Copy link'}
          </MuiButton>
          <MuiButton onClick={() => setPopupBlockedUrl(null)}>Close</MuiButton>
        </DialogActions>
      </Dialog>

      {/* AA-072 mark as applied */}
      <Dialog open={markOpen} onClose={() => setMarkOpen(false)}>
        <DialogTitle>Mark this application as applied?</DialogTitle>
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
