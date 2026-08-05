import { useAssistedApplyEvents } from '@/features/auto-apply/hooks/useAssistedApplyEvents';

import {
  AccessTimeOutlinedIcon,
  Box,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@/lib/material';

import { activityEventCategory, activityEventLabel, formatRelativeTime } from './activityLabels';

const CATEGORY_COLOR: Record<string, string> = {
  tracking: 'primary.main',
  analysis: 'info.main',
  handoff: 'success.main',
  status: 'warning.main',
  other: 'text.disabled',
};

export interface ActivityTimelinePanelProps {
  jobApplicationId: string;
}

export function ActivityTimelinePanel({ jobApplicationId }: ActivityTimelinePanelProps) {
  const eventsQuery = useAssistedApplyEvents(jobApplicationId);

  return (
    <Box
      aria-label="Activity"
      component="aside"
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 2,
        minWidth: { md: 240 },
        maxWidth: { md: 300 },
        width: { xs: '100%', md: 'auto' },
        flexShrink: 0,
      }}
    >
      <Typography sx={{ mb: 1.5 }} variant="subtitle1">
        Activity
      </Typography>

      {eventsQuery.isLoading ? (
        <Stack spacing={1.5}>
          <Skeleton height={36} variant="rounded" />
          <Skeleton height={36} variant="rounded" />
          <Skeleton height={36} variant="rounded" />
        </Stack>
      ) : null}

      {eventsQuery.isError ? (
        <Typography color="text.secondary" variant="body2">
          Couldn&apos;t load activity.
        </Typography>
      ) : null}

      {!eventsQuery.isLoading && !eventsQuery.isError && (eventsQuery.data?.length ?? 0) === 0 ? (
        <Typography color="text.secondary" variant="body2">
          No activity yet.
        </Typography>
      ) : null}

      <Stack component="ol" spacing={1.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {(eventsQuery.data ?? []).map((event) => {
          const category = activityEventCategory(event.eventType);
          const label = activityEventLabel(event.eventType);
          const absolute = new Date(event.createdAt).toLocaleString();
          return (
            <Box
              component="li"
              key={event.id}
              sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: CATEGORY_COLOR[category] ?? 'text.disabled',
                  mt: 0.75,
                  flexShrink: 0,
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2">{label}</Typography>
                <Tooltip title={absolute}>
                  <Typography
                    color="text.secondary"
                    component="span"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                    variant="caption"
                  >
                    <AccessTimeOutlinedIcon fontSize="inherit" />
                    {formatRelativeTime(event.createdAt)}
                  </Typography>
                </Tooltip>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
