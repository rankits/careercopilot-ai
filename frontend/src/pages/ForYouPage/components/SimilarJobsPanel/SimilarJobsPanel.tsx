import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import type { JobCardData } from '@/components/molecules';

import { ROUTES } from '@/constants/routes';
import { Box, CircularProgress, Typography } from '@/lib/material';

import { getPanelId, getTabId } from '../../utils';
import { RecommendationJobList } from '../RecommendationJobList';

type SimilarJobsPanelProps = {
  similarSourceJobId: string | undefined;
  similarJobs: {
    isPending: boolean;
    isError: boolean;
    isFetching: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  similarCards: JobCardData[];
  savedIdSet: Set<string>;
  onApply: (job: JobCardData) => void;
  onSave: (job: JobCardData) => void;
  onOpen: (job: JobCardData) => void;
};

export function SimilarJobsPanel({
  similarSourceJobId,
  similarJobs,
  similarCards,
  savedIdSet,
  onApply,
  onSave,
  onOpen,
}: SimilarJobsPanelProps) {
  return (
    <Box
      aria-labelledby={getTabId('similar')}
      id={getPanelId('similar')}
      role="tabpanel"
      sx={{ display: 'grid', gap: 3 }}
    >
      {!similarSourceJobId ? (
        <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start', py: 4 }}>
          <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 800, m: 0 }}>
            Similar jobs
          </Typography>
          <Typography role="status" sx={{ color: 'text.secondary' }}>
            Open a job detail page to choose the source job for this mode.
          </Typography>
          <Button component={RouterLink} size="small" to={ROUTES.JOB_FEED} variant="outline">
            Browse jobs
          </Button>
        </Box>
      ) : null}

      {similarSourceJobId && similarJobs.isPending ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress aria-label="Loading similar jobs" />
        </Box>
      ) : null}

      {similarSourceJobId && similarJobs.isError ? (
        <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start' }}>
          <Box role="alert">
            <Typography>
              {similarJobs.error instanceof Error
                ? similarJobs.error.message
                : 'Unable to load similar jobs.'}
            </Typography>
          </Box>
          <Button
            disabled={similarJobs.isFetching}
            onClick={() => void similarJobs.refetch()}
            size="small"
          >
            Retry
          </Button>
        </Box>
      ) : null}

      {similarSourceJobId &&
      !similarJobs.isPending &&
      !similarJobs.isError &&
      similarCards.length === 0 ? (
        <Typography role="status" sx={{ color: 'text.secondary', py: 4 }}>
          No similar jobs found for this job.
        </Typography>
      ) : null}

      {similarCards.length > 0 ? (
        <>
          <Typography sx={{ color: 'text.secondary' }}>
            {similarCards.length} similar job{similarCards.length === 1 ? '' : 's'}
          </Typography>
          <RecommendationJobList
            ariaLabel="Similar jobs"
            getKey={(job) => job.id ?? `${job.company}-${job.title}`}
            items={similarCards}
            savedIdSet={savedIdSet}
            showFeedbackActions={false}
            onApply={onApply}
            onSave={onSave}
            onOpen={onOpen}
          />
        </>
      ) : null}
    </Box>
  );
}
