import { useCachedCompanyLogo } from '@/features/jobs/hooks/useCachedCompanyLogo';

import { DASHBOARD_COPY } from '@/constants/pages/dashboard';
import { ROUTES } from '@/constants/routes';
import type { SavedJobCardModel } from '@/features/applications/utils/mapApplicationDtoToSavedJobCard';
import { BookmarkOutlinedIcon, Skeleton } from '@/lib/material';

import {
  EmptyText,
  PanelHeader,
  PanelLink,
  PanelRoot,
  PanelTitle,
  SavedList,
  SavedLogo,
  SavedMeta,
  SavedRow,
  SavedRowSkeleton,
  SavedTitle,
} from '../styles';

export interface RecentlySavedSectionProps {
  jobs: SavedJobCardModel[];
  loading?: boolean;
  onOpenJob: (job: SavedJobCardModel) => void;
}

function SavedJobRow({
  job,
  onOpenJob,
}: {
  job: SavedJobCardModel;
  onOpenJob: (job: SavedJobCardModel) => void;
}) {
  const { src, failed, onLogoError } = useCachedCompanyLogo(job.logoUrl);
  const showLogo = Boolean(src) && !failed;

  return (
    <SavedRow
      aria-label={`Open ${job.title} at ${job.company}`}
      onClick={() => onOpenJob(job)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenJob(job);
        }
      }}
      role="button"
      tabIndex={0}
      type="button"
    >
      <SavedLogo aria-hidden="true">
        {showLogo ? <img alt="" loading="lazy" onError={onLogoError} src={src} /> : job.logo || '?'}
      </SavedLogo>
      <SavedTitle>
        <strong>{job.title}</strong>
        <SavedMeta>
          {job.company} · {job.postedAt}
        </SavedMeta>
      </SavedTitle>
      <BookmarkOutlinedIcon aria-hidden="true" color="primary" fontSize="small" />
    </SavedRow>
  );
}

export function RecentlySavedSection({
  jobs,
  loading = false,
  onOpenJob,
}: RecentlySavedSectionProps) {
  return (
    <PanelRoot>
      <PanelHeader>
        <PanelTitle>{DASHBOARD_COPY.savedTitle}</PanelTitle>
        <PanelLink to={ROUTES.SAVED_JOBS}>{DASHBOARD_COPY.viewAllSaved} →</PanelLink>
      </PanelHeader>

      {loading ? (
        <SavedList aria-busy="true" aria-label="Loading recently saved jobs">
          {Array.from({ length: 3 }).map((_, index) => (
            <SavedRowSkeleton key={index}>
              <Skeleton height={40} variant="rounded" width={40} />
              <div>
                <Skeleton height={18} width="70%" />
                <Skeleton height={14} width="50%" />
              </div>
            </SavedRowSkeleton>
          ))}
        </SavedList>
      ) : jobs.length === 0 ? (
        <EmptyText>{DASHBOARD_COPY.emptySaved}</EmptyText>
      ) : (
        <SavedList>
          {jobs.map((job) => (
            <SavedJobRow job={job} key={job.applicationId} onOpenJob={onOpenJob} />
          ))}
        </SavedList>
      )}
    </PanelRoot>
  );
}
