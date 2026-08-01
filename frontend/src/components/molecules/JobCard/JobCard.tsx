import { useState } from 'react';

import { Button } from '@/components/atoms/Button';

import {
  AccessTimeOutlinedIcon,
  BookmarkBorderOutlinedIcon,
  BookmarkOutlinedIcon,
  BusinessCenterOutlinedIcon,
  LocationOnOutlinedIcon,
  SmartToyOutlinedIcon,
  Typography,
  WorkOutlineOutlinedIcon,
} from '@/lib/material';

import {
  Accent,
  CompanyLogo,
  JobActions,
  JobCardRoot,
  JobDetails,
  JobMeta,
  RecommendationPill,
  MatchPill,
  MatchRing,
  SaveButton,
  SkillList,
  SkillPill,
  TitleRow,
  VerifiedIcon,
} from './styles';

export interface JobCardData {
  id?: string;
  recommendationId?: string;
  accent: 'primary' | 'danger';
  /** Validated http(s) apply URL when available. */
  applyUrl?: string | null;
  company: string;
  experience: string;
  experienceBand: string;
  logo: string;
  /** Optional company logo image; falls back to `logo` initial. */
  logoUrl?: string;
  location: string;
  /** Real recommendation score only — omit while mock/unwired. */
  match?: number;
  matchSubtitle?: string;
  postedAt: string;
  isRecommended?: boolean;
  salary: string;
  salaryBand: string;
  skills: string[];
  tags: string[];
  title: string;
  type: string;
}

export interface JobCardProps {
  job: JobCardData;
  isSaved?: boolean;
  onApply?: (job: JobCardData) => void;
  onOpen?: (job: JobCardData) => void;
  onSave?: (job: JobCardData) => void;
  onDismiss?: (job: JobCardData) => void;
  onNotRelevant?: (job: JobCardData) => void;
}

export function JobCard({
  job,
  isSaved = false,
  onApply,
  onOpen,
  onSave,
  onDismiss,
  onNotRelevant,
}: JobCardProps) {
  const showMatch = typeof job.match === 'number';
  const showActions = Boolean(onApply || onSave || onDismiss || onNotRelevant);
  const canApply = Boolean(job.applyUrl);
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogoImage = Boolean(job.logoUrl) && !logoFailed;

  return (
    <JobCardRoot
      onClick={onOpen ? () => onOpen(job) : undefined}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpen(job);
              }
            }
          : undefined
      }
      role={onOpen ? 'link' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      sx={onOpen ? { cursor: 'pointer' } : undefined}
    >
      <Accent tone={job.accent} />
      <CompanyLogo aria-label={`${job.company} logo`}>
        {showLogoImage ? (
          <img
            alt=""
            loading="lazy"
            onError={() => setLogoFailed(true)}
            src={job.logoUrl}
          />
        ) : (
          job.logo || '?'
        )}
      </CompanyLogo>

      <JobDetails>
        {job.isRecommended ? (
          <RecommendationPill>
            <SmartToyOutlinedIcon fontSize="small" />
            AI Recommended
          </RecommendationPill>
        ) : null}

        <TitleRow>
          <div>
            <Typography component="h2">{job.title}</Typography>
            <Typography component="p">
              {job.company} <span>-</span> {job.location}
            </Typography>
            {job.matchSubtitle ? (
              <Typography component="p" sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                {job.matchSubtitle}
              </Typography>
            ) : null}
          </div>
          <VerifiedIcon fontSize="small" aria-hidden="true" />
        </TitleRow>

        <JobMeta>
          <span>
            <BusinessCenterOutlinedIcon fontSize="small" /> {job.salary}
          </span>
          <span>
            <AccessTimeOutlinedIcon fontSize="small" /> {job.experience}
          </span>
          <span>
            <WorkOutlineOutlinedIcon fontSize="small" /> {job.type}
          </span>
          <span>
            <LocationOnOutlinedIcon fontSize="small" /> {job.postedAt}
          </span>
        </JobMeta>

        {job.skills.length > 0 ? (
          <SkillList>
            {job.skills.map((skill) => (
              <SkillPill key={skill}>{skill}</SkillPill>
            ))}
          </SkillList>
        ) : null}
      </JobDetails>

      {showMatch || showActions ? (
        <JobActions>
          {showMatch ? (
            <MatchPill aria-label={`${job.match} percent match`}>
              {job.match}% Match
              <MatchRing aria-hidden="true" />
            </MatchPill>
          ) : null}
          {onDismiss ? (
            <Button
              aria-label={`Dismiss ${job.title} recommendation`}
              onClick={(event) => {
                event.stopPropagation();
                onDismiss(job);
              }}
              size="small"
              variant="text"
            >
              Dismiss
            </Button>
          ) : null}
          {onNotRelevant ? (
            <Button
              aria-label={`Mark ${job.title} as not relevant`}
              onClick={(event) => {
                event.stopPropagation();
                onNotRelevant(job);
              }}
              size="small"
              variant="text"
            >
              Not relevant
            </Button>
          ) : null}
          {onSave ? (
            <SaveButton
              aria-label={isSaved ? `Unsave ${job.title}` : `Save ${job.title}`}
              aria-pressed={isSaved}
              onClick={(event) => {
                event.stopPropagation();
                onSave(job);
              }}
            >
              {isSaved ? (
                <BookmarkOutlinedIcon fontSize="small" />
              ) : (
                <BookmarkBorderOutlinedIcon fontSize="small" />
              )}
            </SaveButton>
          ) : null}
          {onApply ? (
            <Button
              disabled={!canApply}
              onClick={(event) => {
                event.stopPropagation();
                if (!canApply) return;
                onApply(job);
              }}
              size="small"
              variant="outline"
            >
              Apply Now
            </Button>
          ) : null}
        </JobActions>
      ) : null}
    </JobCardRoot>
  );
}
