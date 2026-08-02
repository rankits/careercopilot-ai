import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { JobFeedLoadingState, JobFeedStatus } from '@/components/molecules';

import { useJobDetail } from '@/features/jobs/hooks/useJobDetail';

import { ROUTES } from '@/constants/routes';
import { JobNotFoundError } from '@/features/jobs/services/jobs.service';
import { extractJobDetailSections } from '@/features/jobs/utils/extractJobDetailSections';
import { openExternalApply, toSafeApplyUrl } from '@/features/jobs/utils/openExternalApply';
import { sanitizeJobHtml } from '@/features/jobs/utils/sanitizeJobHtml';
import { Box, Typography } from '@/lib/material';

import { jobDetailPageSx } from './styles';

function DetailSection({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) return null;

  return (
    <Box component="section" sx={jobDetailPageSx.panel}>
      <Typography component="h2" sx={jobDetailPageSx.sectionTitle}>
        {title}
      </Typography>
      <Box component="ul" sx={{ margin: 0, paddingInlineStart: '1.25rem' }}>
        {items.map((item) => (
          <Typography component="li" key={`${title}-${item}`} sx={jobDetailPageSx.listItem}>
            {item}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const feedReturnTo =
    (location.state as { fromFeed?: string } | null)?.fromFeed ?? ROUTES.JOB_FEED;

  const { data: job, isPending, isError, error, refetch, isFetching } = useJobDetail(jobId);
  const notFound = error instanceof JobNotFoundError;
  const applyUrl = toSafeApplyUrl(job?.applyUrl);
  const sections = useMemo(
    () => extractJobDetailSections(job?.descriptionText, job?.benefits),
    [job?.benefits, job?.descriptionText],
  );

  return (
    <Box component="section" sx={jobDetailPageSx.root}>
      <Button onClick={() => void navigate(feedReturnTo)} size="small" variant="outline">
        Back to job feed
      </Button>

      {isPending ? <JobFeedLoadingState label="Loading job details…" /> : null}

      {isError && notFound ? (
        <JobFeedStatus
          message="This job may have expired or the link is invalid."
          onRetry={() => void navigate(ROUTES.JOB_FEED)}
          retryLabel="Browse jobs"
          title="Job not found"
          tone="error"
        />
      ) : null}

      {isError && !notFound ? (
        <JobFeedStatus
          message={error instanceof Error ? error.message : 'Unable to load this job.'}
          onRetry={isFetching ? undefined : () => void refetch()}
          title="Unable to load job details"
          tone="error"
        />
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
            <Button disabled={!applyUrl} onClick={() => openExternalApply(applyUrl)} size="small">
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

          <DetailSection items={sections.responsibilities} title="Responsibilities" />
          <DetailSection items={sections.requirements} title="Requirements" />
          <DetailSection items={sections.benefits} title="Benefits" />

          {job.descriptionHtml ? (
            <Box
              dangerouslySetInnerHTML={{ __html: sanitizeJobHtml(job.descriptionHtml) }}
              sx={jobDetailPageSx.description}
            />
          ) : (
            <Typography sx={jobDetailPageSx.description} whiteSpace="pre-wrap">
              {sections.remainingDescription || 'No description provided.'}
            </Typography>
          )}
        </Box>
      ) : null}
    </Box>
  );
}
