import { Alert, Box, Stack, Typography } from '@/lib/material';

import { formatRelativeTime } from './activityLabels';

export interface DoneStepProps {
  status: string;
  submittedAt?: string | null;
}

export function DoneStep({ status, submittedAt }: DoneStepProps) {
  const isSubmitted = status === 'SUBMITTED' || status === 'CONFIRMATION_RECEIVED';
  const isWithdrawn = status === 'WITHDRAWN';
  const isJobClosed = status === 'JOB_CLOSED';
  const isCouldNotApply = status === 'COULD_NOT_APPLY';

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Application tracking completed</Typography>

      {isSubmitted ? (
        <Alert severity="success">
          <strong>Submitted manually.</strong> We've recorded that you submitted this application{' '}
          {submittedAt ? formatRelativeTime(submittedAt) : 'recently'}.
        </Alert>
      ) : isWithdrawn ? (
        <Alert severity="info">
          <strong>Withdrawn by user.</strong> You stopped tracking this job.
        </Alert>
      ) : isJobClosed ? (
        <Alert severity="warning">
          <strong>Could not apply — job closed.</strong> This position is no longer accepting
          applications.
        </Alert>
      ) : isCouldNotApply ? (
        <Alert severity="warning">
          <strong>Could not apply — application page unavailable.</strong> You reported that the
          application link was broken or the form could not be completed.
        </Alert>
      ) : (
        <Alert severity="info">
          <strong>Application status: {status.replace(/_/g, ' ')}</strong>.
        </Alert>
      )}

      <Box
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography color="text.secondary" variant="body2">
          Career Copilot will continue to track this application in your Submissions dashboard.
        </Typography>
      </Box>
    </Stack>
  );
}
