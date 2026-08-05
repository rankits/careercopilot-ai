import { Button } from '@/components/atoms/Button';

import { APP_ACTIONS, JOB_FEED_STATUS_MESSAGES, JOB_FEED_STATUS_RULES } from '@/constants/ui';
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
    return JOB_FEED_STATUS_MESSAGES.defaultError;
  }

  const rule = JOB_FEED_STATUS_RULES.find(({ pattern }) => pattern.test(normalized));

  return rule?.message ?? normalized;
}

export function JobFeedLoadingState({ label = JOB_FEED_STATUS_MESSAGES.loading }: { label?: string }) {
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
  retryLabel = APP_ACTIONS.RETRY,
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
