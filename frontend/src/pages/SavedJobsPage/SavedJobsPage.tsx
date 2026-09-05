import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import BookmarkOutlinedIcon from '@mui/icons-material/BookmarkOutlined';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import {
  FilterDropdown,
  JobFeedLoadingState,
  JobFeedStatus,
  SavedJobCard,
} from '@/components/molecules';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { savedJobsQueryKey, useSaveJob } from '@/features/applications/hooks/useSaveJob';

import penguinLogoUrl from '@/assets/logo/career-copilot-penguin.png';
import {
  SAVED_JOBS_COPY,
  savedJobSortOptions,
  type SavedJobSort,
} from '@/constants/pages/savedJobs';
import { ROUTES, jobDetailPath } from '@/constants/routes';
import { applicationsService } from '@/features/applications/services/applications.service';
import type { ApplicationDto } from '@/features/applications/types/application.types';
import {
  mapApplicationDtoToSavedJobCard,
  type SavedJobCardModel,
} from '@/features/applications/utils/mapApplicationDtoToSavedJobCard';

import { savedJobsPageSx } from './styles';

function sortSavedJobs(jobs: SavedJobCardModel[], sortBy: SavedJobSort): SavedJobCardModel[] {
  const sorted = [...jobs];
  sorted.sort((left, right) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(left.savedAt).getTime() - new Date(right.savedAt).getTime();
      case 'company':
        return left.company.localeCompare(right.company);
      case 'title':
        return left.title.localeCompare(right.title);
      case 'recent':
      default:
        return new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime();
    }
  });
  return sorted;
}

export function SavedJobsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { unsaveJob } = useSaveJob();

  const [sortBy, setSortBy] = useState<SavedJobSort>('recent');
  const [removedIds, setRemovedIds] = useState<Record<string, true>>({});

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: savedJobsQueryKey,
    queryFn: () => applicationsService.listSavedJobs(),
  });

  const cards = useMemo(
    () =>
      sortSavedJobs(
        (data ?? [])
          .filter((app) => !removedIds[app.id])
          .map((app, index) => mapApplicationDtoToSavedJobCard(app, index)),
        sortBy,
      ),
    [data, removedIds, sortBy],
  );

  const handleOpenJob = (job: SavedJobCardModel) => {
    if (!job.id) return;
    void navigate(jobDetailPath(job.id), {
      state: { fromFeed: `${location.pathname}${location.search}` },
    });
  };

  const handleUnsave = async (job: SavedJobCardModel) => {
    if (!job.id) {
      showToast({ message: SAVED_JOBS_COPY.removeFailedToast, severity: 'error' });
      return;
    }

    const previous = queryClient.getQueryData<ApplicationDto[]>(savedJobsQueryKey);
    setRemovedIds((current) => ({ ...current, [job.applicationId]: true }));
    queryClient.setQueryData<ApplicationDto[]>(savedJobsQueryKey, (current) =>
      (current ?? []).filter((item) => item.id !== job.applicationId),
    );

    try {
      await unsaveJob(job.id);
      showToast({ message: SAVED_JOBS_COPY.removedToast, severity: 'success' });
    } catch {
      setRemovedIds((current) => {
        const next = { ...current };
        delete next[job.applicationId];
        return next;
      });
      queryClient.setQueryData(savedJobsQueryKey, previous);
      showToast({ message: SAVED_JOBS_COPY.removeFailedToast, severity: 'error' });
    }
  };

  const showEmpty = !isPending && !isError && cards.length === 0;

  return (
    <Box component="section" sx={savedJobsPageSx.root}>
      <Box sx={savedJobsPageSx.header}>
        <Box aria-hidden="true" sx={savedJobsPageSx.headerIcon}>
          <BookmarkOutlinedIcon fontSize="medium" />
        </Box>
        <Box sx={savedJobsPageSx.headerCopy}>
          <Typography component="h1" sx={savedJobsPageSx.title}>
            {SAVED_JOBS_COPY.title}
          </Typography>
          <Typography sx={savedJobsPageSx.subtitle}>{SAVED_JOBS_COPY.subtitle}</Typography>
        </Box>
      </Box>

      {!showEmpty ? (
        <Box sx={savedJobsPageSx.toolbar}>
          <Box sx={savedJobsPageSx.controls}>
            <FilterDropdown
              fullWidth
              label={SAVED_JOBS_COPY.sortPrefix}
              onChange={(value) => setSortBy(value as SavedJobSort)}
              options={savedJobSortOptions}
              prefix={SAVED_JOBS_COPY.sortPrefix}
              value={sortBy}
            />
          </Box>
        </Box>
      ) : null}

      {isPending ? <JobFeedLoadingState label={SAVED_JOBS_COPY.loading} /> : null}

      {isError ? (
        <JobFeedStatus
          message={error instanceof Error ? error.message : 'Unable to load saved jobs.'}
          onRetry={isFetching ? undefined : () => void refetch()}
          title="Couldn't load saved jobs"
          tone="error"
        />
      ) : null}

      {showEmpty ? (
        <Box role="status" sx={savedJobsPageSx.empty}>
          <Box aria-hidden="true" sx={savedJobsPageSx.emptyIcon}>
            <BookmarkBorderOutlinedIcon fontSize="medium" />
          </Box>
          <Typography component="h2" sx={savedJobsPageSx.emptyTitle}>
            {SAVED_JOBS_COPY.emptyTitle}
          </Typography>
          <Typography sx={savedJobsPageSx.emptyDescription}>
            {SAVED_JOBS_COPY.emptyDescription}
          </Typography>
          <Button component={RouterLink} size="small" to={ROUTES.JOB_FEED}>
            {SAVED_JOBS_COPY.browseJobs}
          </Button>
        </Box>
      ) : null}

      {!isPending && !isError && cards.length > 0 ? (
        <>
          <Box component="ul" sx={savedJobsPageSx.list}>
            {cards.map((job) => (
              <Box component="li" key={job.applicationId}>
                <SavedJobCard
                  job={job}
                  onOpen={job.id ? handleOpenJob : undefined}
                  onUnsave={job.id ? (selected) => void handleUnsave(selected) : undefined}
                />
              </Box>
            ))}
          </Box>

          <Box sx={savedJobsPageSx.cta}>
            <Box aria-hidden="true" sx={savedJobsPageSx.ctaArt}>
              <img alt="" src={penguinLogoUrl} />
            </Box>
            <Box sx={savedJobsPageSx.ctaCopy}>
              <Typography component="h2" sx={savedJobsPageSx.ctaTitle}>
                {SAVED_JOBS_COPY.ctaTitle}
              </Typography>
              <Typography sx={savedJobsPageSx.ctaDescription}>
                {SAVED_JOBS_COPY.ctaDescription}
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              endIcon={<ArrowForwardIcon fontSize="small" />}
              size="small"
              to={ROUTES.JOB_FEED}
              variant="outline"
            >
              {SAVED_JOBS_COPY.exploreJobs}
            </Button>
          </Box>
        </>
      ) : null}
    </Box>
  );
}
