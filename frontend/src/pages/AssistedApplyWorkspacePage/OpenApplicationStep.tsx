import { useState } from 'react';

import { useApplicationReadiness } from '@/features/auto-apply/hooks/useApplicationReadiness';
import { useHandoffApplication } from '@/features/auto-apply/hooks/useResumeHandoff';
import { isAutoApplyClientError } from '@/features/auto-apply/utils/apiError';
import { formatRelativeTime } from './activityLabels';
import {
  Alert,
  Box,
  CircularProgress,
  MuiButton,
  Stack,
  Tooltip,
  Typography,
} from '@/lib/material';

const HANDOFF_ENABLED = import.meta.env.VITE_ASSISTED_APPLY_DIRECT_HANDOFF !== 'false';

export interface OpenApplicationStepProps {
  jobId: string;
  jobApplicationId: string;
  openedAt: string | null;
  applyUrl: string | null;
}

export function OpenApplicationStep({
  jobId,
  jobApplicationId,
  openedAt,
  applyUrl,
}: OpenApplicationStepProps) {
  const readinessQuery = useApplicationReadiness(jobId, 'HANDOFF', jobApplicationId);
  const handoffMutation = useHandoffApplication(jobApplicationId);
  const [localError, setLocalError] = useState<string | null>(null);

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
  const blockMessage = blocking[0]?.message ?? 'Resolve the blocking items first.';

  const openTab = (url: string) => {
    window.open(url, '_blank', 'noopener');
  };

  const handleOpen = () => {
    setLocalError(null);
    if (alreadyOpened && applyUrl) {
      openTab(applyUrl);
      return;
    }
    handoffMutation.mutate(undefined, {
      onSuccess: (result) => {
        openTab(result.applyUrl);
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

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Open application</Typography>
      <Typography color="text.secondary" variant="body2">
        We&apos;ll open the employer&apos;s application page in a new tab. Career Copilot does not
        fill or submit the form for you.
      </Typography>

      {alreadyOpened && openedAt ? (
        <Alert severity="success">
          Application opened {formatRelativeTime(openedAt)}
        </Alert>
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
            disabled={handoffMutation.isPending}
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
    </Stack>
  );
}
