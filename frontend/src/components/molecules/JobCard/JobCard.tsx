import { useState, type MouseEvent } from 'react';

import { Button } from '@/components/atoms/Button';

import { APP_ACTIONS, JOB_CARD_ARIA, JOB_CARD_COPY, JOB_UI } from '@/constants/ui';
import {
  BookmarkBorderOutlinedIcon,
  BookmarkOutlinedIcon,
  BlockOutlinedIcon,
  BusinessCenterOutlinedIcon,
  DescriptionOutlinedIcon,
  FlagOutlinedIcon,
  HistoryOutlinedIcon,
  LocationOnOutlinedIcon,
  MenuItem,
  MoreVertIcon,
  PersonOutlineIcon,
  SmartToyOutlinedIcon,
  ThumbDownOutlinedIcon,
  ThumbUpOutlinedIcon,
  Typography,
  WorkOutlineOutlinedIcon,
} from '@/lib/material';

import {
  Accent,
  CardBody,
  CompanyLogo,
  HeaderEnd,
  HeaderRow,
  JobActions,
  JobActionsMenu,
  JobCardRoot,
  JobDetails,
  JobMeta,
  MatchPill,
  MatchRing,
  MainRow,
  MoreActionsButton,
  OpenJobButton,
  RecommendationPill,
  saveActionButtonSx,
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
  /** Server-provided saved state for authenticated users. */
  isSaved?: boolean;
}

export interface JobCardProps {
  job: JobCardData;
  isSaved?: boolean;
  /** Adds an elevated hover treatment (border/shadow/lift) — used by premium feed surfaces. */
  premiumHover?: boolean;
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
  const showPrimaryActions = Boolean(onApply || onSave);
  const canApply = Boolean(job.applyUrl);
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<HTMLElement | null>(null);
  const details = job.recommendationDetails;
  const actionsMenuId = `${toDomId(job.recommendationId ?? job.id ?? `${job.company}-${job.title}`)}-actions`;
  const hasSkillGap = details?.skillGap
    ? Object.values(details.skillGap).some((values) => values.length > 0)
    : false;
  const hasDetails = Boolean(
    details && (details.summary || details.bullets.length > 0 || hasSkillGap),
  );
  const canOpenDetails = Boolean(onOpen && hasDetails);
  const showOverflowMenu = Boolean(
    onDismiss || onNotRelevant || onMoreLikeThis || onLessLikeThis || canOpenDetails,
  );
  const showHeaderEnd = showMatch || showOverflowMenu;
  const hasExperience = Boolean(job.experience.trim());
  const hasLocation = Boolean(job.location.trim());
  const actionsMenuOpen = Boolean(actionsMenuAnchor);

  const openActionsMenu = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setActionsMenuAnchor(event.currentTarget);
  };

  const closeActionsMenu = () => {
    setActionsMenuAnchor(null);
  };

  const runAction = (action: () => void) => {
    closeActionsMenu();
    action();
  };

  return (
    <JobCardRoot
      onClick={onOpen ? () => onOpen(job) : undefined}
      premiumHover={premiumHover}
      sx={onOpen ? { cursor: 'pointer' } : undefined}
    >
      <Accent tone={job.accent} />
      <CardBody>
        {job.isRecommended || showHeaderEnd ? (
          <HeaderRow>
            {job.isRecommended ? (
              <RecommendationPill>
                <SmartToyOutlinedIcon fontSize="small" />
                {JOB_CARD_COPY.aiRecommended}
              </RecommendationPill>
            ) : (
              <span />
            )}

            {showHeaderEnd ? (
              <HeaderEnd>
                {typeof job.match === 'number' ? (
                  <MatchPill aria-label={JOB_CARD_ARIA.match(job.match, job.matchSubtitle)}>
                    {job.match}
                    {JOB_UI.MATCH_SUFFIX}
                    <MatchRing aria-hidden="true" />
                  </MatchPill>
                ) : null}
                {showOverflowMenu ? (
                  <>
                    <MoreActionsButton
                      aria-controls={actionsMenuOpen ? actionsMenuId : undefined}
                      aria-expanded={actionsMenuOpen}
                      aria-haspopup="menu"
                      aria-label={`More actions for ${job.title}`}
                      data-action="more"
                      onClick={openActionsMenu}
                    >
                      <MoreVertIcon fontSize="small" />
                    </MoreActionsButton>
                    <JobActionsMenu
                      anchorEl={actionsMenuAnchor}
                      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                      id={actionsMenuId}
                      onClick={(event) => event.stopPropagation()}
                      onClose={closeActionsMenu}
                      open={actionsMenuOpen}
                      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    >
                      {onMoreLikeThis ? (
                        <MenuItem
                          aria-label={JOB_CARD_ARIA.moreLikeThis(isMoreLikeThis, job.title)}
                          aria-pressed={isMoreLikeThis}
                          disabled={isMoreLikeThis}
                          onClick={() => runAction(() => onMoreLikeThis(job))}
                        >
                          <ThumbUpOutlinedIcon fontSize="small" />
                          {JOB_CARD_COPY.moreLikeThis}
                        </MenuItem>
                      ) : null}
                      {onLessLikeThis ? (
                        <MenuItem
                          aria-label={JOB_CARD_ARIA.lessLikeThis(job.title)}
                          onClick={() => runAction(() => onLessLikeThis(job))}
                        >
                          <ThumbDownOutlinedIcon fontSize="small" />
                          {JOB_CARD_COPY.lessLikeThis}
                        </MenuItem>
                      ) : null}
                      {onNotRelevant ? (
                        <MenuItem
                          aria-label={JOB_CARD_ARIA.notRelevant(job.title)}
                          onClick={() => runAction(() => onNotRelevant(job))}
                        >
                          <BlockOutlinedIcon fontSize="small" />
                          {JOB_CARD_COPY.notRelevant}
                        </MenuItem>
                      ) : null}
                      {onDismiss ? (
                        <MenuItem
                          aria-label={JOB_CARD_ARIA.dismiss(job.title)}
                          onClick={() => runAction(() => onDismiss(job))}
                        >
                          <FlagOutlinedIcon fontSize="small" />
                          {JOB_CARD_COPY.dismiss}
                        </MenuItem>
                      ) : null}
                      {canOpenDetails ? (
                        <MenuItem
                          aria-label={JOB_CARD_ARIA.details(job.title)}
                          data-action="details"
                          onClick={() => runAction(() => onOpen?.(job))}
                        >
                          <DescriptionOutlinedIcon fontSize="small" />
                          {JOB_CARD_COPY.details}
                        </MenuItem>
                      ) : null}
                    </JobActionsMenu>
                  </>
                ) : null}
              </HeaderEnd>
            ) : null}
          </HeaderRow>
        ) : null}

        <MainRow>
          <CompanyLogo aria-label={JOB_CARD_ARIA.companyLogo(job.company)}>
            {job.logo || '?'}
          </CompanyLogo>

          <JobDetails>
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
                {job.matchSubtitle ? (
                  <Typography component="p">{job.matchSubtitle}</Typography>
                ) : null}
              </div>
              {job.verified ? (
                <VerifiedIcon fontSize="small" aria-label={JOB_CARD_COPY.verifiedCompany} />
              ) : null}
            </TitleRow>
          </JobDetails>
        </MainRow>

        {showPrimaryActions ? (
          <JobActions>
            {onSave ? (
              <Button
                data-action="save"
                aria-label={JOB_CARD_ARIA.save(isSaved, job.title)}
                aria-pressed={isSaved}
                onClick={(event) => {
                  event.stopPropagation();
                  onSave(job);
                }}
                size="small"
                startIcon={
                  isSaved ? (
                    <BookmarkOutlinedIcon fontSize="small" />
                  ) : (
                    <BookmarkBorderOutlinedIcon fontSize="small" />
                  )
                }
                sx={saveActionButtonSx}
                variant="outline"
              >
                <span className="save-action-label">
                  {isSaved ? APP_ACTIONS.SAVED : APP_ACTIONS.SAVE_FOR_LATER}
                </span>
              </Button>
            ) : null}
            {onApply ? (
              <Button
                data-action="apply"
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
          </JobActions>
        ) : null}

        <JobMeta>
          <span>
            <BusinessCenterOutlinedIcon fontSize="inherit" /> {job.salary}
          </span>
          {hasExperience ? (
            <span>
              <PersonOutlineIcon fontSize="inherit" /> {job.experience}
            </span>
          ) : null}
          <span>
            <WorkOutlineOutlinedIcon fontSize="inherit" /> {job.type}
          </span>
          {hasLocation ? (
            <span>
              <LocationOnOutlinedIcon fontSize="inherit" /> {job.location}
            </span>
          ) : null}
          <span>
            <HistoryOutlinedIcon fontSize="inherit" /> {job.postedAt}
          </span>
        </JobMeta>

        {job.skills.length > 0 ? (
          <SkillList>
            {job.skills.map((skill) => (
              <SkillPill key={skill}>{skill}</SkillPill>
            ))}
          </SkillList>
        ) : null}
      </CardBody>
    </JobCardRoot>
  );
}
