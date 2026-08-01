import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { ROUTES } from '@/constants/routes';
import { JobNotFoundError } from '@/features/jobs/services/jobs.service';
import { useJobDetail } from '@/features/jobs/hooks/useJobDetail';
import { openExternalApply, toSafeApplyUrl } from '@/features/jobs/utils/openExternalApply';
import { sanitizeJobHtml } from '@/features/jobs/utils/sanitizeJobHtml';
import { Box, CircularProgress, Typography } from '@/lib/material';

import { jobDetailPageSx } from './styles';

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const feedReturnTo =
    (location.state as { fromFeed?: string } | null)?.fromFeed ?? ROUTES.JOB_FEED;

  const { data: job, isPending, isError, error, refetch, isFetching } = useJobDetail(jobId);
  const notFound = error instanceof JobNotFoundError;
  const applyUrl = toSafeApplyUrl(job?.applyUrl);

  return (
    <Box component="section" sx={jobDetailPageSx.root}>
      <Button
        onClick={() => void navigate(feedReturnTo)}
        size="small"
        variant="outline"
      >
        Back to job feed
      </Button>

      {isPending ? (
        <Box aria-busy="true" sx={jobDetailPageSx.centered}>
          <CircularProgress aria-label="Loading job details" />
        </Box>
      ) : null}

      {isError && notFound ? (
        <Box role="alert" sx={jobDetailPageSx.centered}>
          <Typography component="h1" sx={jobDetailPageSx.title}>
            Job not found
          </Typography>
          <Typography sx={jobDetailPageSx.muted}>
            This job may be inactive or no longer available.
          </Typography>
          <Button onClick={() => void navigate(ROUTES.JOB_FEED)} size="small">
            Browse jobs
          </Button>
        </Box>
      ) : null}

      {isError && !notFound ? (
        <Box role="alert" sx={jobDetailPageSx.centered}>
          <Typography>
            {error instanceof Error ? error.message : 'Unable to load this job.'}
          </Typography>
          <Button disabled={isFetching} onClick={() => void refetch()} size="small">
            Retry
          </Button>
        </Box>
      ) : null}

      {job ? (
        <Box sx={jobDetailPageSx.content}>
          <Typography component="h1" sx={jobDetailPageSx.title}>
            {job.title}
          </Typography>
          <Typography sx={jobDetailPageSx.subtitle}>
            {job.company.name} · {job.location.formatted}
          </Typography>
          <Typography sx={jobDetailPageSx.meta}>
            {[job.employmentType, job.location.remoteType, job.company.verified ? 'Verified' : null]
              .filter(Boolean)
              .join(' · ')}
          </Typography>

          <Box sx={jobDetailPageSx.actions}>
            <Button
              disabled={!applyUrl}
              onClick={() => openExternalApply(applyUrl)}
              size="small"
            >
              Apply Now
            </Button>
          </Box>

          {job.skills.length ? (
            <Box sx={jobDetailPageSx.skills}>
              {job.skills.map((skill) => (
                <Box component="span" key={skill} sx={jobDetailPageSx.skill}>
                  {skill}
                </Box>
              ))}
            </Box>
          ) : null}

          {job.descriptionHtml ? (
            <Box
              dangerouslySetInnerHTML={{ __html: sanitizeJobHtml(job.descriptionHtml) }}
              sx={jobDetailPageSx.description}
            />
          ) : (
            <Typography sx={jobDetailPageSx.description} whiteSpace="pre-wrap">
              {job.descriptionText || 'No description provided.'}
            </Typography>
          )}
        </Box>
      ) : null}
    </Box>
  );
}
