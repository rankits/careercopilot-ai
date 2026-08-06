import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import {
  JobCard,
  JobFeedLoadingState,
  JobFeedStatus,
  VirtualizedJobList,
} from '@/components/molecules';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useJobDetail } from '@/features/jobs/hooks/useJobDetail';
import { useSimilarJobs } from '@/features/recommendations/hooks/useRecommendations';

import { jobDetailPath, ROUTES } from '@/constants/routes';
import { JobNotFoundError } from '@/features/jobs/services/jobs.service';
import { extractJobDetailSections } from '@/features/jobs/utils/extractJobDetailSections';
import { formatJobSalary } from '@/features/jobs/utils/formatJobSalary';
import { formatPostedAt } from '@/features/jobs/utils/formatPostedAt';
import { openExternalApply, toSafeApplyUrl } from '@/features/jobs/utils/openExternalApply';
import { resolveJobDescriptionDisplay } from '@/features/jobs/utils/resolveJobDescriptionDisplay';
import {
  Box,
  BusinessCenterOutlinedIcon,
  ChevronLeftIcon,
  HistoryOutlinedIcon,
  LocationOnOutlinedIcon,
  Typography,
  WorkOutlineOutlinedIcon,
} from '@/lib/material';

import { JobAboutRoleSection } from './JobAboutRoleSection';
import { JobDetailSectionHeader } from './JobDetailSectionHeader';
import { jobDetailPageSx } from './styles';

const SIMILAR_JOBS_ERROR_TOAST = 'Unable to load similar jobs. Please try again.';

function DetailSection({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) return null;

  return (
    <Box component="section" sx={jobDetailPageSx.panel}>
      <JobDetailSectionHeader title={title} />
      <Box component="ul" sx={jobDetailPageSx.sectionList}>
        {items.map((item) => (
          <Typography component="li" key={`${title}-${item}`} sx={jobDetailPageSx.listItem}>
            {item}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

function formatEnumLabel(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => {
      if (part === 'onsite') return 'On-site';
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function companyInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [showSimilarJobs, setShowSimilarJobs] = useState(false);
  const lastSimilarErrorToastAt = useRef(0);
  const feedReturnTo =
    (location.state as { fromFeed?: string } | null)?.fromFeed ?? ROUTES.JOB_FEED;

  const { data: job, isPending, isError, error, refetch, isFetching } = useJobDetail(jobId);
  const similarJobs = useSimilarJobs(jobId, { enabled: false });

  useEffect(() => {
    setShowSimilarJobs(false);
    lastSimilarErrorToastAt.current = 0;
  }, [jobId]);

  useEffect(() => {
    if (!showSimilarJobs) return;
    if (!similarJobs.isError || similarJobs.failureCount < 1) return;
    if (lastSimilarErrorToastAt.current === similarJobs.failureCount) return;
    lastSimilarErrorToastAt.current = similarJobs.failureCount;
    showToast({ message: SIMILAR_JOBS_ERROR_TOAST, severity: 'error' });
  }, [showSimilarJobs, showToast, similarJobs.failureCount, similarJobs.isError]);

  const handleFindSimilar = () => {
    setShowSimilarJobs(true);
    void similarJobs.refetch();
  };

  const notFound = error instanceof JobNotFoundError;
  const applyUrl = toSafeApplyUrl(job?.applyUrl);
  const similarCards = similarJobs.data?.cards ?? [];
  const sections = useMemo(
    () => extractJobDetailSections(job?.descriptionText, job?.benefits),
    [job?.benefits, job?.descriptionText],
  );
  const descriptionDisplay = useMemo(
    () =>
      resolveJobDescriptionDisplay({
        descriptionHtml: job?.descriptionHtml,
        descriptionText: job?.descriptionText,
        remainingDescription: sections.remainingDescription,
      }),
    [job?.descriptionHtml, job?.descriptionText, sections.remainingDescription],
  );

  const metaChips = useMemo(() => {
    if (!job) return [];
    return [
      formatEnumLabel(job.employmentType),
      formatEnumLabel(job.location.remoteType),
      job.company.verified ? 'Verified' : null,
    ].filter((value): value is string => Boolean(value));
  }, [job]);

  const hasStructuredSections =
    sections.responsibilities.length > 0 ||
    sections.requirements.length > 0 ||
    sections.benefits.length > 0;

  const showDescriptionPanel = Boolean(
    job && (descriptionDisplay.content !== 'No description provided.' || !hasStructuredSections),
  );

  return (
    <Box component="section" sx={jobDetailPageSx.root}>
      <Box sx={jobDetailPageSx.backButton}>
        <Button
          onClick={() => void navigate(feedReturnTo)}
          size="small"
          startIcon={<ChevronLeftIcon fontSize="small" />}
          variant="outline"
        >
          Back to job feed
        </Button>
      </Box>

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
          <Box sx={jobDetailPageSx.hero}>
            <Box sx={jobDetailPageSx.heroTop}>
              <Box aria-label={`${job.company.name} logo`} sx={jobDetailPageSx.companyLogo}>
                {companyInitial(job.company.name)}
              </Box>

              <Box sx={jobDetailPageSx.heroCopy}>
                <Typography component="h1" sx={jobDetailPageSx.title}>
                  {job.title}
                </Typography>
                <Typography sx={jobDetailPageSx.subtitle}>
                  {job.company.name}
                  {job.location.formatted ? ` · ${job.location.formatted}` : ''}
                </Typography>

                {metaChips.length > 0 ? (
                  <Box aria-label="Job attributes" sx={jobDetailPageSx.metaRow}>
                    {metaChips.map((chip) => (
                      <Box component="span" key={chip} sx={jobDetailPageSx.metaChip}>
                        {chip}
                      </Box>
                    ))}
                  </Box>
                ) : null}
              </Box>
            </Box>

            <Box sx={jobDetailPageSx.facts}>
              <span>
                <BusinessCenterOutlinedIcon fontSize="small" />
                {formatJobSalary(job.salary)}
              </span>
              <span>
                <WorkOutlineOutlinedIcon fontSize="small" />
                {formatEnumLabel(job.location.remoteType) ??
                  formatEnumLabel(job.employmentType) ??
                  'Work mode not listed'}
              </span>
              <span>
                <LocationOnOutlinedIcon fontSize="small" />
                {job.location.formatted || 'Location not listed'}
              </span>
              <span>
                <HistoryOutlinedIcon fontSize="small" />
                {formatPostedAt(job.publishedAt)}
              </span>
            </Box>

            <Box sx={jobDetailPageSx.actions}>
              <Button disabled={!applyUrl} onClick={() => openExternalApply(applyUrl)} size="small">
                Apply Now
              </Button>
              <Button
                disabled={!jobId || similarJobs.isFetching}
                onClick={handleFindSimilar}
                size="small"
                variant="outline"
              >
                Find similar
              </Button>
            </Box>

            {job.skills.length > 0 ? (
              <Box aria-label="Skills" sx={jobDetailPageSx.skills}>
                {job.skills.map((skill) => (
                  <Box component="span" key={skill} sx={jobDetailPageSx.skill}>
                    {skill}
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>

          <DetailSection items={sections.responsibilities} title="Responsibilities" />
          <DetailSection items={sections.requirements} title="Requirements" />
          <DetailSection items={sections.benefits} title="Benefits" />

          {showDescriptionPanel ? <JobAboutRoleSection description={descriptionDisplay} /> : null}

          {showSimilarJobs ? (
            <Box component="section" sx={jobDetailPageSx.similarSection}>
              <Typography component="h2" sx={jobDetailPageSx.sectionTitle}>
                Similar jobs
              </Typography>

              {similarJobs.isPending ? (
                <JobFeedLoadingState label="Loading similar jobs..." />
              ) : null}

              {similarJobs.isError ? (
                <JobFeedStatus
                  message="We couldn’t load similar jobs for this listing. Please try again."
                  onRetry={similarJobs.isFetching ? undefined : () => void similarJobs.refetch()}
                  title="Unable to load similar jobs"
                  tone="error"
                />
              ) : null}

              {!similarJobs.isPending && !similarJobs.isError && similarCards.length === 0 ? (
                <JobFeedStatus
                  message="We couldn’t find similar jobs for this listing. Please try again."
                  onRetry={similarJobs.isFetching ? undefined : () => void similarJobs.refetch()}
                  title="No similar jobs found"
                  tone="info"
                />
              ) : null}

              {similarCards.length > 0 ? (
                <VirtualizedJobList
                  ariaLabel="Similar jobs"
                  getKey={(similarJob) =>
                    similarJob.id ?? `${similarJob.company}-${similarJob.title}`
                  }
                  items={similarCards}
                  renderItem={(similarJob) => (
                    <JobCard
                      job={similarJob}
                      onApply={(selected) => {
                        openExternalApply(selected.applyUrl);
                      }}
                      onOpen={(selected) => {
                        if (!selected.id) return;
                        void navigate(jobDetailPath(selected.id), {
                          state: { fromFeed: `${location.pathname}${location.search}` },
                        });
                      }}
                    />
                  )}
                />
              ) : null}
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
