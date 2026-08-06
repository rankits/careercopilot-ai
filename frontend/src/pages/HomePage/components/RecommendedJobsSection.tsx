import { Button } from '@/components/atoms/Button';
import type { JobCardData } from '@/components/molecules';

import { DASHBOARD_COPY } from '@/constants/pages/dashboard';
import { ROUTES } from '@/constants/routes';
import { JOB_UI } from '@/constants/ui';
import {
  ArrowForwardIcon,
  LocationOnOutlinedIcon,
  Skeleton,
  WorkOutlineOutlinedIcon,
} from '@/lib/material';

import {
  EmptyText,
  PanelHeader,
  PanelLink,
  PanelRoot,
  PanelTitle,
  RecommendedGrid,
  RecommendedJobCard,
  RecommendedLogo,
  RecommendedMatch,
  RecommendedMeta,
  RecommendedTitle,
} from '../styles';

export interface RecommendedJobsSectionProps {
  jobs: JobCardData[];
  loading?: boolean;
  onOpenJob: (job: JobCardData) => void;
}

function RecommendedJobItem({
  job,
  onOpenJob,
}: {
  job: JobCardData;
  onOpenJob: (job: JobCardData) => void;
}) {
  return (
    <RecommendedJobCard>
      <RecommendedLogo aria-hidden="true">{job.logo || '?'}</RecommendedLogo>
      <RecommendedTitle>
        <p>{job.company}</p>
        <h3>{job.title}</h3>
      </RecommendedTitle>
      <RecommendedMeta>
        {job.location ? (
          <span>
            <LocationOnOutlinedIcon fontSize="inherit" />
            {job.location}
          </span>
        ) : null}
        <span>
          <WorkOutlineOutlinedIcon fontSize="inherit" />
          {job.type}
        </span>
      </RecommendedMeta>
      {typeof job.match === 'number' ? (
        <RecommendedMatch>
          {job.match}
          {JOB_UI.MATCH_SUFFIX}
        </RecommendedMatch>
      ) : null}
      <Button
        aria-label={`View ${job.title}`}
        endIcon={<ArrowForwardIcon fontSize="small" />}
        onClick={() => onOpenJob(job)}
        size="small"
        variant="outline"
      >
        {DASHBOARD_COPY.viewJob}
      </Button>
    </RecommendedJobCard>
  );
}

export function RecommendedJobsSection({
  jobs,
  loading = false,
  onOpenJob,
}: RecommendedJobsSectionProps) {
  return (
    <PanelRoot>
      <PanelHeader>
        <PanelTitle>{DASHBOARD_COPY.recommendedTitle}</PanelTitle>
        <PanelLink to={ROUTES.AI_MATCH}>{DASHBOARD_COPY.viewAllJobs} →</PanelLink>
      </PanelHeader>

      {loading ? (
        <RecommendedGrid aria-busy="true" aria-label="Loading recommended jobs">
          {Array.from({ length: 3 }).map((_, index) => (
            <RecommendedJobCard key={index}>
              <Skeleton height={44} variant="rounded" width={44} />
              <Skeleton height={18} width="60%" />
              <Skeleton height={22} width="80%" />
              <Skeleton height={16} width="70%" />
              <Skeleton height={32} width="100%" />
            </RecommendedJobCard>
          ))}
        </RecommendedGrid>
      ) : jobs.length === 0 ? (
        <EmptyText>{DASHBOARD_COPY.emptyRecommended}</EmptyText>
      ) : (
        <RecommendedGrid>
          {jobs.map((job) => (
            <RecommendedJobItem
              job={job}
              key={job.id ?? `${job.company}-${job.title}`}
              onOpenJob={onOpenJob}
            />
          ))}
        </RecommendedGrid>
      )}
    </PanelRoot>
  );
}
