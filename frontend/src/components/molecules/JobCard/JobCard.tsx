import { useState } from 'react';

import { Button } from '@/components/atoms/Button';

import {
  AccessTimeOutlinedIcon,
  BookmarkBorderOutlinedIcon,
  BookmarkOutlinedIcon,
  BusinessCenterOutlinedIcon,
  ExpandMoreIcon,
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
  MatchPill,
  MatchRing,
  OpenJobButton,
  RecommendationDetails,
  RecommendationDetailsGrid,
  RecommendationDetailSkillGroup,
  RecommendationPill,
  SaveButton,
  SkillList,
  SkillPill,
  TitleRow,
  VerifiedIcon,
} from './styles';

export interface JobCardRecommendationDetails {
  summary?: string;
  bullets: Array<{
    label: string;
    score?: number;
    message: string;
    evidence: string[];
  }>;
  skillGap?: {
    exact: string[];
    alias: string[];
    related: string[];
    transferable: string[];
    missing: string[];
  };
}

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
  recommendationDetails?: JobCardRecommendationDetails;
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
  onMoreLikeThis?: (job: JobCardData) => void;
  onLessLikeThis?: (job: JobCardData) => void;
  onNotRelevant?: (job: JobCardData) => void;
  isMoreLikeThis?: boolean;
}

const toDomId = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '');

export function JobCard({
  job,
  isSaved = false,
  onApply,
  onOpen,
  onSave,
  onDismiss,
  onMoreLikeThis,
  onLessLikeThis,
  onNotRelevant,
  isMoreLikeThis = false,
}: JobCardProps) {
  const showMatch = typeof job.match === 'number';
  const showWiredActions = Boolean(
    onApply || onSave || onDismiss || onMoreLikeThis || onLessLikeThis || onNotRelevant,
  );
  const canApply = Boolean(job.applyUrl);
  const [logoFailed, setLogoFailed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const showLogoImage = Boolean(job.logoUrl) && !logoFailed;
  const details = job.recommendationDetails;
  const detailsId = `${toDomId(job.recommendationId ?? job.id ?? `${job.company}-${job.title}`)}-recommendation-details`;
  const hasSkillGap = details?.skillGap
    ? Object.values(details.skillGap).some((values) => values.length > 0)
    : false;
  const hasDetails = Boolean(
    details && (details.summary || details.bullets.length > 0 || hasSkillGap),
  );
  const showActions = showWiredActions || hasDetails;

  return (
    <JobCardRoot
      onClick={onOpen ? () => onOpen(job) : undefined}
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
            <Typography component="h2">
              {onOpen ? (
                <OpenJobButton
                  aria-label={`Open ${job.title} at ${job.company}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(job);
                  }}
                  type="button"
                >
                  {job.title}
                </OpenJobButton>
              ) : (
                job.title
              )}
            </Typography>
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
            <MatchPill
              aria-label={`${job.match} percent match${job.matchSubtitle ? `, ${job.matchSubtitle}` : ''}`}
            >
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
          {onMoreLikeThis ? (
            <Button
              aria-label={
                isMoreLikeThis
                  ? `More jobs like ${job.title} selected`
                  : `Show more jobs like ${job.title}`
              }
              aria-pressed={isMoreLikeThis}
              disabled={isMoreLikeThis}
              onClick={(event) => {
                event.stopPropagation();
                onMoreLikeThis(job);
              }}
              size="small"
              variant="text"
            >
              More like this
            </Button>
          ) : null}
          {onLessLikeThis ? (
            <Button
              aria-label={`Show fewer jobs like ${job.title}`}
              onClick={(event) => {
                event.stopPropagation();
                onLessLikeThis(job);
              }}
              size="small"
              variant="text"
            >
              Less like this
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
              aria-label={canApply ? `Apply to ${job.title}` : `Apply to ${job.title} unavailable`}
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
          {hasDetails ? (
            <Button
              aria-controls={detailsId}
              aria-expanded={detailsOpen}
              aria-label={`${detailsOpen ? 'Hide' : 'Show'} details for ${job.title}`}
              onClick={(event) => {
                event.stopPropagation();
                setDetailsOpen((open) => !open);
              }}
              size="small"
              startIcon={
                <ExpandMoreIcon
                  fontSize="small"
                  sx={{ transform: detailsOpen ? 'rotate(180deg)' : undefined }}
                />
              }
              variant="text"
            >
              Details
            </Button>
          ) : null}
        </JobActions>
      ) : null}

      {hasDetails && detailsOpen ? (
        <RecommendationDetails aria-label={`${job.title} recommendation details`} id={detailsId} role="region">
          {details?.summary ? <Typography component="p">{details.summary}</Typography> : null}

          {details?.bullets.length ? (
            <RecommendationDetailsGrid>
              {details.bullets.slice(0, 3).map((bullet) => (
                <div key={`${bullet.label}-${bullet.message}`}>
                  <Typography component="h3">
                    {bullet.label}
                    {typeof bullet.score === 'number' ? ` - ${Math.round(bullet.score * 100)}%` : ''}
                  </Typography>
                  <Typography component="p">{bullet.message}</Typography>
                  {bullet.evidence.length ? (
                    <Typography component="p">{bullet.evidence.slice(0, 2).join(', ')}</Typography>
                  ) : null}
                </div>
              ))}
            </RecommendationDetailsGrid>
          ) : null}

          {hasSkillGap && details?.skillGap ? (
            <RecommendationDetailsGrid>
              {(
                [
                  ['Matched', details.skillGap.exact],
                  ['Alias', details.skillGap.alias],
                  ['Related', details.skillGap.related],
                  ['Transferable', details.skillGap.transferable],
                  ['Missing', details.skillGap.missing],
                ] satisfies Array<[string, string[]]>
              ).map(([label, values]) =>
                Array.isArray(values) && values.length > 0 ? (
                  <RecommendationDetailSkillGroup key={label}>
                    <Typography component="h3">{label}</Typography>
                    <div>
                      {values.map((skill) => (
                        <span key={`${label}-${skill}`}>{skill}</span>
                      ))}
                    </div>
                  </RecommendationDetailSkillGroup>
                ) : null,
              )}
            </RecommendationDetailsGrid>
          ) : null}
        </RecommendationDetails>
      ) : null}
    </JobCardRoot>
  );
}
