import { Button } from '@/components/atoms/Button';

import { Alert, Box, CircularProgress, RefreshIcon, Typography } from '@/lib/material';
import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

interface JobFeedStatusProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  title: string;
  tone?: 'info' | 'error';
}

export function JobFeedLoadingState({ label = 'Loading jobs…' }: { label?: string }) {
  return (
    <Box
      aria-busy="true"
      aria-label={label}
      sx={{
        alignItems: 'center',
        display: 'grid',
        gap: spacing[3],
        justifyItems: 'center',
        minHeight: '16rem',
        padding: spacing[6],
      }}
    >
      <CircularProgress size={36} />
      <Typography sx={{ color: colorTokens.textSecondary, fontSize: fontSize.sm }}>
        {label}
      </Typography>
    </Box>
  );
}

export function JobFeedStatus({
  message,
  onRetry,
  retryLabel = 'Retry',
  title,
  tone = 'info',
}: JobFeedStatusProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: spacing[3],
        justifyItems: 'start',
        minHeight: '12rem',
        padding: `${spacing[4]} 0`,
      }}
    >
      <Alert
        role={tone === 'error' ? 'alert' : 'status'}
        severity={tone === 'error' ? 'error' : 'info'}
        sx={{ width: '100%' }}
        action={
          onRetry ? (
            <Button
              onClick={onRetry}
              size="small"
              startIcon={<RefreshIcon fontSize="small" />}
              variant="outline"
            >
              {retryLabel}
            </Button>
          ) : undefined
        }
      >
        <Typography
          component="h2"
          sx={{ display: 'block', fontSize: fontSize.sm, fontWeight: fontWeight.bold, m: 0 }}
        >
          {title}
        </Typography>
        <Typography component="span" sx={{ fontSize: fontSize.sm }}>
          {message}
        </Typography>
      </Alert>
    </Box>
  );
}
