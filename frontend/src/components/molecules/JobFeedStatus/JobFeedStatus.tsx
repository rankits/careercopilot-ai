import { Button } from '@/components/atoms/Button';

import {
  Box,
  CircularProgress,
  ErrorOutlineIcon,
  InfoOutlinedIcon,
  RefreshIcon,
  Typography,
} from '@/lib/material';
import { colorTokens } from '@/tokens';

import { jobFeedStatusSx } from './styles';

interface JobFeedStatusProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  title: string;
  tone?: 'info' | 'error';
}

function toFriendlyMessage(message: string): string {
  const normalized = message.trim();
  if (!normalized) {
    return 'Something went wrong. Please try again.';
  }

  if (/status code 404|not found/i.test(normalized)) {
    return 'We couldn’t find matching results right now. Try again in a moment.';
  }
  if (/status code 401|unauthorized|session/i.test(normalized)) {
    return 'Your session may have expired. Sign in again, then retry.';
  }
  if (/status code 403|forbidden/i.test(normalized)) {
    return 'You don’t have access to this content.';
  }
  if (
    /status code 5\d\d|unavailable|network|timeout|failed to fetch|network error/i.test(normalized)
  ) {
    return 'The service is temporarily unavailable. Please try again.';
  }
  if (/request failed with status code/i.test(normalized)) {
    return 'We couldn’t complete this request. Please try again.';
  }

  return normalized;
}

export function JobFeedLoadingState({ label = 'Loading jobs…' }: { label?: string }) {
  return (
    <Box aria-busy="true" aria-label={label} sx={jobFeedStatusSx.loadingRoot}>
      <CircularProgress size={36} />
      <Typography sx={jobFeedStatusSx.loadingLabel}>{label}</Typography>
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
  const isError = tone === 'error';
  const friendlyMessage = toFriendlyMessage(message);
  const Icon = isError ? ErrorOutlineIcon : InfoOutlinedIcon;
  const iconBackground = isError
    ? colorTokens.actionDangerSurface
    : colorTokens.actionPrimarySurface;
  const iconColor = isError ? colorTokens.actionDanger : colorTokens.actionPrimary;

  return (
    <Box role={isError ? 'alert' : 'status'} sx={jobFeedStatusSx.root}>
      <Box
        aria-hidden="true"
        sx={{
          ...jobFeedStatusSx.iconWrap,
          background: iconBackground,
          color: iconColor,
        }}
      >
        <Icon fontSize="medium" />
      </Box>

      <Box sx={jobFeedStatusSx.copy}>
        <Typography component="h2" sx={jobFeedStatusSx.title}>
          {title}
        </Typography>
        <Typography sx={jobFeedStatusSx.message}>{friendlyMessage}</Typography>
      </Box>

      {onRetry ? (
        <Button
          onClick={onRetry}
          size="small"
          startIcon={<RefreshIcon fontSize="small" />}
          variant="outline"
        >
          {retryLabel}
        </Button>
      ) : null}
    </Box>
  );
}
