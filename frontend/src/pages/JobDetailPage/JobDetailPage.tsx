import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import {
  JobCard,
  JobFeedLoadingState,
  JobFeedStatus,
  VirtualizedJobList,
} from '@/components/molecules';

import { useTrackAndOpenApply } from '@/features/auto-apply/hooks/useTrackAndOpenApply';
import { useCachedCompanyLogo } from '@/features/jobs/hooks/useCachedCompanyLogo';
import { useJobDetail } from '@/features/jobs/hooks/useJobDetail';
import { useSimilarJobs } from '@/features/recommendations/hooks/useRecommendations';

import { jobDetailPath, ROUTES } from '@/constants/routes';
import { JobNotFoundError } from '@/features/jobs/services/jobs.service';
import type { JobDetailDto } from '@/features/jobs/types/job.types';
import { extractJobDetailSections } from '@/features/jobs/utils/extractJobDetailSections';
import { formatPostedAt } from '@/features/jobs/utils/formatPostedAt';
import { openExternalApply, toSafeApplyUrl } from '@/features/jobs/utils/openExternalApply';
import { resolveCompanyLogoUrl } from '@/features/jobs/utils/resolveCompanyLogoUrl';
import { sanitizeJobHtml } from '@/features/jobs/utils/sanitizeJobHtml';
import {
  Box,
  BusinessCenterOutlinedIcon,
  HistoryOutlinedIcon,
  LocationOnOutlinedIcon,
  Typography,
  WorkOutlineOutlinedIcon,
} from '@/lib/material';

import { jobDetailPageSx } from './styles';

function DetailSection({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) return null;

  return (
    <Box component="section" sx={jobDetailPageSx.panel}>
      <Typography component="h2" sx={jobDetailPageSx.sectionTitle}>
        {title}
      </Typography>
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

function formatSalary(salary: JobDetailDto['salary']): string {
  const { minimum, maximum, currency } = salary;
  if (minimum == null && maximum == null) return 'Not disclosed';
  const code = currency?.toUpperCase() ?? '';
  const unit = code === 'INR' ? 'LPA' : code;
  if (minimum != null && maximum != null) {
    return unit
      ? `${unit} ${minimum.toLocaleString()} - ${maximum.toLocaleString()}`
      : `${minimum.toLocaleString()} - ${maximum.toLocaleString()}`;
  }
  const value = (minimum ?? maximum) as number;
  return unit ? `${unit} ${value.toLocaleString()}` : value.toLocaleString();
}

function companyInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

function companyLogoSrc(job: {
  company: { logoUrl: string | null; slug: string; name: string };
}): string | undefined {
  return resolveCompanyLogoUrl({
    logoUrl: job.company.logoUrl,
    companySlug: job.company.slug,
    companyName: job.company.name,
  });
}

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSimilarJobs, setShowSimilarJobs] = useState(false);
  const { trackAndOpenApply, isPending: isTrackingApply } = useTrackAndOpenApply();
  const feedReturnTo =
    (location.state as { fromFeed?: string } | null)?.fromFeed ?? ROUTES.JOB_FEED;

  const { data: job, isPending, isError, error, refetch, isFetching } = useJobDetail(jobId);
  const similarJobs = useSimilarJobs(jobId, {
    enabled: showSimilarJobs && Boolean(jobId),
    limit: 6,
  });

  const companyLogoUrl = job ? companyLogoSrc(job) : undefined;
  const { src: logoSrc, failed: logoFailed, onLogoError } = useCachedCompanyLogo(companyLogoUrl);

  const notFound = error instanceof JobNotFoundError;
  const applyUrl = toSafeApplyUrl(job?.applyUrl);
  const similarCards = similarJobs.data?.cards ?? [];
  const sections = useMemo(
    () => extractJobDetailSections(job?.descriptionText, job?.benefits),
    [job?.benefits, job?.descriptionText],
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

  const descriptionBody = job?.descriptionHtml
    ? null
    : sections.remainingDescription || 'No description provided.';
  const showDescriptionPanel = Boolean(
    job &&
    (job.descriptionHtml ||
      descriptionBody !== 'No description provided.' ||
      !hasStructuredSections),
  );

  return (
    <Box component="section" sx={jobDetailPageSx.root}>
      <Box sx={jobDetailPageSx.backButton}>
        <Button onClick={() => void navigate(feedReturnTo)} size="small" variant="outline">
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
                {logoSrc && !logoFailed ? (
                  <img alt="" loading="lazy" onError={onLogoError} src={logoSrc} />
                ) : (
                  companyInitial(job.company.name)
                )}
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
                {formatSalary(job.salary)}
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
                disabled={!jobId}
                isLoading={isTrackingApply}
                onClick={() =>
                  void trackAndOpenApply({
                    jobId,
                    applyUrl,
                    openExternal: false,
                    applyMode: 'PREPARE',
                  })
                }
                size="small"
              >
                Prepare Application
              </Button>
              <Button
                disabled={!jobId}
                isLoading={isTrackingApply}
                onClick={() =>
                  void trackAndOpenApply({
                    jobId,
                    applyUrl,
                    openExternal: false,
                    applyMode: 'ASSISTED',
                  })
                }
                size="small"
                variant="outline"
              >
                Assisted Apply
              </Button>
              <Button
                disabled={!jobId}
                onClick={() => setShowSimilarJobs(true)}
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
                <Typography role="status" sx={jobDetailPageSx.muted}>
                  No similar jobs found for this job.
                </Typography>
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

          <DetailSection items={sections.responsibilities} title="Responsibilities" />
          <DetailSection items={sections.requirements} title="Requirements" />
          <DetailSection items={sections.benefits} title="Benefits" />

          {showDescriptionPanel ? (
            <Box component="section" sx={jobDetailPageSx.panel}>
              <Typography component="h2" sx={jobDetailPageSx.sectionTitle}>
                About this role
              </Typography>
              {job.descriptionHtml ? (
                <Box
                  dangerouslySetInnerHTML={{ __html: sanitizeJobHtml(job.descriptionHtml) }}
                  sx={jobDetailPageSx.description}
                />
              ) : (
                <Typography sx={jobDetailPageSx.description} whiteSpace="pre-wrap">
                  {descriptionBody}
                </Typography>
              )}
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
