import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { ROUTES } from '@/constants/routes';
import {
  applicationsService,
} from '@/features/applications/services/applications.service';
import { savedJobsQueryKey } from '@/features/applications/hooks/useSaveJob';
import { Box, CircularProgress, Typography } from '@/lib/material';

export function SavedJobsPage() {
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: savedJobsQueryKey,
    queryFn: () => applicationsService.listSavedJobs(),
  });

  return (
    <Box component="section" sx={{ display: 'grid', gap: 3, py: 2 }}>
      <Typography component="h1" sx={{ fontWeight: 800, fontSize: '1.5rem', m: 0 }}>
        Saved Jobs
      </Typography>
      <Typography sx={{ color: 'text.secondary' }}>
        Jobs you bookmarked from the feed (Application status SAVED).
      </Typography>

      {isPending ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress aria-label="Loading saved jobs" />
        </Box>
      ) : null}

      {isError ? (
        <Box role="alert" sx={{ display: 'grid', gap: 2, justifyItems: 'start' }}>
          <Typography>
            {error instanceof Error ? error.message : 'Unable to load saved jobs.'}
          </Typography>
          <Button disabled={isFetching} onClick={() => void refetch()} size="small">
            Retry
          </Button>
        </Box>
      ) : null}

      {!isPending && !isError && (data?.length ?? 0) === 0 ? (
        <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start', py: 4 }}>
          <Typography role="status">No saved jobs yet.</Typography>
          <Button component={RouterLink} size="small" to={ROUTES.JOB_FEED} variant="outline">
            Browse job feed
          </Button>
        </Box>
      ) : null}

      {!isPending && !isError && (data?.length ?? 0) > 0 ? (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 2 }}>
          {data?.map((app) => (
            <Box
              component="li"
              key={app.id}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 2,
              }}
            >
              <Typography component="h2" sx={{ fontWeight: 700, m: 0 }}>
                {app.jobTitle}
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>{app.companyName}</Typography>
              {app.jobId ? (
                <Button
                  component={RouterLink}
                  size="small"
                  sx={{ mt: 1 }}
                  to={`/jobs/${app.jobId}`}
                  variant="outline"
                >
                  View job
                </Button>
              ) : null}
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
