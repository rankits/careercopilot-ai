
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { Button } from '@/components/atoms/Button';

import { APP_ACTIONS, JOB_FEED_STATUS_MESSAGES, JOB_FEED_STATUS_RULES } from '@/constants/ui';
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

export function JobFeedLoadingState({
  label = JOB_FEED_STATUS_MESSAGES.loading,
}: {
  label?: string;
}) {
  return (
    <Box aria-busy="true" aria-label={label} role="status" sx={jobFeedStatusSx.skeletonRoot}>
      <Typography component="span" sx={jobFeedStatusSx.visuallyHidden}>
        {label}
      </Typography>
      {Array.from({ length: 4 }, (_, index) => (
        <Box key={index} sx={jobFeedStatusSx.skeletonCard}>
          <Skeleton animation="wave" height={22} variant="rounded" width="42%" />
          <Skeleton animation="wave" height={18} variant="rounded" width="28%" />
          <Skeleton animation="wave" height={14} variant="rounded" width="70%" />
          <Skeleton animation="wave" height={14} variant="rounded" width="55%" />
        </Box>
      ))}
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
