import { useState, type MouseEvent } from 'react';

import { Button } from '@/components/atoms/Button';

import { useCachedCompanyLogo } from '@/features/jobs/hooks/useCachedCompanyLogo';

import {
  APP_ACTIONS,
  JOB_CARD_ARIA,
  JOB_CARD_COPY,
  JOB_CARD_LIMITS,
  JOB_UI,
  SKILL_GAP_SECTIONS,
} from '@/constants/ui';
import {
  BookmarkBorderOutlinedIcon,
  BookmarkOutlinedIcon,
  BusinessCenterOutlinedIcon,
  ExpandMoreIcon,
  HistoryOutlinedIcon,
  LocationOnOutlinedIcon,
  Menu,
  MenuItem,
  MoreVertIcon,
  PersonOutlineIcon,
  SmartToyOutlinedIcon,
  Tooltip,
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
  OverflowButton,
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
  /** When true, show the verified badge beside the title. */
  verified?: boolean;
}

export interface JobCardOverflowItem {
  id: string;
  label: string;
  onSelect: () => void;
}

export interface JobCardProps {
  job: JobCardData;
  isSaved?: boolean;
  /** Soft hover elevation + primary border (Saved Jobs). */
  premiumHover?: boolean;
  /** Renders a primary View Job button that calls `onOpen`. */
  showViewJob?: boolean;
  overflowItems?: JobCardOverflowItem[];
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
  premiumHover = false,
  showViewJob = false,
  overflowItems,
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
    onApply ||
      onSave ||
      onDismiss ||
      onMoreLikeThis ||
      onLessLikeThis ||
      onNotRelevant ||
      (showViewJob && onOpen) ||
      (overflowItems && overflowItems.length > 0),
  );
  const canApply = Boolean(job.applyUrl);
  const canViewJob = Boolean(showViewJob && onOpen && job.id);
  const { src: logoSrc, failed: logoFailed, onLogoError } = useCachedCompanyLogo(job.logoUrl);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const showLogoImage = Boolean(logoSrc) && !logoFailed;
  const details = job.recommendationDetails;
  const detailsId = `${toDomId(job.recommendationId ?? job.id ?? `${job.company}-${job.title}`)}-recommendation-details`;
  const hasSkillGap = details?.skillGap
    ? Object.values(details.skillGap).some((values) => values.length > 0)
    : false;
  const hasDetails = Boolean(
    details && (details.summary || details.bullets.length > 0 || hasSkillGap),
  );
  const showActions = showWiredActions || hasDetails || showMatch;
  const hasExperience = Boolean(job.experience.trim());
  const hasLocation = Boolean(job.location.trim());
  const visibleSkills = job.skills.slice(0, 4);

  const handleOpenMenu = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };

  return (
    <JobCardRoot
      onClick={onOpen ? () => onOpen(job) : undefined}
      premiumHover={premiumHover}
      sx={onOpen ? { cursor: 'pointer' } : undefined}
    >
      <Accent tone={job.accent} />
      <CompanyLogo aria-label={JOB_CARD_ARIA.companyLogo(job.company)}>
        {showLogoImage ? (
          <img alt="" loading="lazy" onError={onLogoError} src={logoSrc} />
        ) : (
          job.logo || '?'
        )}
      </CompanyLogo>

      <JobDetails>
        {job.isRecommended ? (
          <RecommendationPill>
            <SmartToyOutlinedIcon fontSize="small" />
            {JOB_CARD_COPY.aiRecommended}
          </RecommendationPill>
        ) : null}

        <TitleRow>
          <div>
            <Typography component="h2">
              {onOpen ? (
                <OpenJobButton
                  aria-label={JOB_CARD_ARIA.open(job.title, job.company)}
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
            <Typography component="p">{job.company}</Typography>
            {job.matchSubtitle ? <Typography component="p">{job.matchSubtitle}</Typography> : null}
          </div>
          {job.verified ? (
            <VerifiedIcon fontSize="small" aria-label={JOB_CARD_COPY.verifiedCompany} />
          ) : null}
        </TitleRow>

        <JobMeta>
          <span>
            <BusinessCenterOutlinedIcon fontSize="small" /> {job.salary}
          </span>
          {hasExperience ? (
            <span>
              <PersonOutlineIcon fontSize="small" /> {job.experience}
            </span>
          ) : null}
          <span>
            <WorkOutlineOutlinedIcon fontSize="small" /> {job.type}
          </span>
          {hasLocation ? (
            <span>
              <LocationOnOutlinedIcon fontSize="small" /> {job.location}
            </span>
          ) : null}
          <span>
            <HistoryOutlinedIcon fontSize="small" /> {job.postedAt}
          </span>
        </JobMeta>

        {visibleSkills.length > 0 ? (
          <SkillList>
            {visibleSkills.map((skill) => (
              <SkillPill key={skill}>{skill}</SkillPill>
            ))}
          </SkillList>
        ) : null}
      </JobDetails>

      {showActions ? (
        <JobActions>
          {showMatch ? (
            <MatchPill aria-label={JOB_CARD_ARIA.match(job.match, job.matchSubtitle)}>
              {job.match}
              {JOB_UI.MATCH_SUFFIX}
              <MatchRing aria-hidden="true" />
            </MatchPill>
          ) : null}
          {onDismiss ? (
            <Button
              aria-label={JOB_CARD_ARIA.dismiss(job.title)}
              onClick={(event) => {
                event.stopPropagation();
                onDismiss(job);
              }}
              size="small"
              variant="ghost"
            >
              {JOB_CARD_COPY.dismiss}
            </Button>
          ) : null}
          {onNotRelevant ? (
            <Button
              aria-label={JOB_CARD_ARIA.notRelevant(job.title)}
              onClick={(event) => {
                event.stopPropagation();
                onNotRelevant(job);
              }}
              size="small"
              variant="ghost"
            >
              {JOB_CARD_COPY.notRelevant}
            </Button>
          ) : null}
          {onMoreLikeThis ? (
            <Button
              aria-label={JOB_CARD_ARIA.moreLikeThis(isMoreLikeThis, job.title)}
              aria-pressed={isMoreLikeThis}
              disabled={isMoreLikeThis}
              onClick={(event) => {
                event.stopPropagation();
                onMoreLikeThis(job);
              }}
              size="small"
              variant="ghost"
            >
              {JOB_CARD_COPY.moreLikeThis}
            </Button>
          ) : null}
          {onLessLikeThis ? (
            <Button
              aria-label={JOB_CARD_ARIA.lessLikeThis(job.title)}
              onClick={(event) => {
                event.stopPropagation();
                onLessLikeThis(job);
              }}
              size="small"
              variant="ghost"
            >
              {JOB_CARD_COPY.lessLikeThis}
            </Button>
          ) : null}
          {onSave ? (
            <Tooltip
              disableInteractive
              placement="top"
              title={isSaved ? JOB_CARD_COPY.unsaveJob : JOB_CARD_COPY.saveJob}
            >
              <span>
                <SaveButton
                  aria-label={JOB_CARD_ARIA.save(isSaved, job.title)}
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
              </span>
            </Tooltip>
          ) : null}
          {overflowItems && overflowItems.length > 0 ? (
            <>
              <OverflowButton
                aria-haspopup="menu"
                aria-label={JOB_CARD_ARIA.moreActions(job.title)}
                onClick={handleOpenMenu}
              >
                <MoreVertIcon fontSize="small" />
              </OverflowButton>
              <Menu
                anchorEl={menuAnchor}
                onClick={(event) => event.stopPropagation()}
                onClose={handleCloseMenu}
                open={Boolean(menuAnchor)}
              >
                {overflowItems.map((item) => (
                  <MenuItem
                    key={item.id}
                    onClick={() => {
                      handleCloseMenu();
                      item.onSelect();
                    }}
                  >
                    {item.label}
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : null}
          {canViewJob ? (
            <Button
              aria-label={JOB_CARD_ARIA.viewJob(job.title)}
              onClick={(event) => {
                event.stopPropagation();
                onOpen?.(job);
              }}
              size="small"
            >
              {APP_ACTIONS.VIEW_JOB}
            </Button>
          ) : null}
          {onApply ? (
            <Button
              aria-label={JOB_CARD_ARIA.apply(job.title, canApply)}
              disabled={!canApply}
              onClick={(event) => {
                event.stopPropagation();
                if (!canApply) return;
                onApply(job);
              }}
              size="small"
              variant="outline"
            >
              {APP_ACTIONS.APPLY_NOW}
            </Button>
          ) : null}
          {hasDetails ? (
            <Button
              aria-controls={detailsId}
              aria-expanded={detailsOpen}
              aria-label={JOB_CARD_ARIA.details(detailsOpen, job.title)}
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
              variant="ghost"
            >
              {JOB_CARD_COPY.details}
            </Button>
          ) : null}
        </JobActions>
      ) : null}

      {hasDetails && detailsOpen ? (
        <RecommendationDetails
          aria-label={JOB_CARD_ARIA.recommendationDetails(job.title)}
          id={detailsId}
          role="region"
        >
          {details?.summary ? <Typography component="p">{details.summary}</Typography> : null}

          {details?.bullets.length ? (
            <RecommendationDetailsGrid>
              {details.bullets.slice(0, JOB_CARD_LIMITS.maxBullets).map((bullet) => (
                <div key={`${bullet.label}-${bullet.message}`}>
                  <Typography component="h3">
                    {bullet.label}
                    {typeof bullet.score === 'number'
                      ? ` - ${Math.round(bullet.score * JOB_CARD_LIMITS.percentScale)}%`
                      : ''}
                  </Typography>
                  <Typography component="p">{bullet.message}</Typography>
                  {bullet.evidence.length ? (
                    <Typography component="p">
                      {bullet.evidence.slice(0, JOB_CARD_LIMITS.maxEvidence).join(', ')}
                    </Typography>
                  ) : null}
                </div>
              ))}
            </RecommendationDetailsGrid>
          ) : null}

          {hasSkillGap && details?.skillGap ? (
            <RecommendationDetailsGrid>
              {SKILL_GAP_SECTIONS.map(({ key, label }) => {
                const values = details.skillGap[key];
                if (!values.length) return null;

                return (
                  <RecommendationDetailSkillGroup key={label}>
                    <Typography component="h3">{label}</Typography>
                    <div>
                      {values.map((skill) => (
                        <span key={`${label}-${skill}`}>{skill}</span>
                      ))}
                    </div>
                  </RecommendationDetailSkillGroup>
                );
              })}
            </RecommendationDetailsGrid>
          ) : null}
        </RecommendationDetails>
      ) : null}
    </JobCardRoot>
  );
}
