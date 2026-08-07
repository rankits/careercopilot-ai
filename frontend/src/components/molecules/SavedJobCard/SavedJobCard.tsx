
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BookmarkOutlinedIcon from '@mui/icons-material/BookmarkOutlined';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Button } from '@/components/atoms/Button';

import { APP_ACTIONS, JOB_CARD_ARIA, JOB_CARD_COPY, JOB_UI } from '@/constants/ui';
import type { SavedJobCardModel } from '@/features/applications/utils/mapApplicationDtoToSavedJobCard';

import {
  AccentBar,
  ActionsRow,
  CardRoot,
  CompanyRow,
  LeftColumn,
  Logo,
  MatchBadge,
  MetaRow,
  RightColumn,
  SavedMeta,
  SaveIconButton,
  SkillChip,
  SkillRow,
  TitleBlock,
  TopRight,
} from './styles';

export interface SavedJobCardProps {
  job: SavedJobCardModel;
  onOpen?: (job: SavedJobCardModel) => void;
  onUnsave?: (job: SavedJobCardModel) => void;
}

export function SavedJobCard({ job, onOpen, onUnsave }: SavedJobCardProps) {
  const visibleSkills = job.skills.slice(0, 4);
  const canOpen = Boolean(job.id && onOpen);

  return (
    <CardRoot
      onClick={canOpen ? () => onOpen?.(job) : undefined}
      role={canOpen ? 'button' : undefined}
      tabIndex={canOpen ? 0 : undefined}
      onKeyDown={
        canOpen
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpen?.(job);
              }
            }
          : undefined
      }
    >
      <AccentBar tone={job.accent} />
      <LeftColumn>
        <CompanyRow>
          <Logo aria-label={JOB_CARD_ARIA.companyLogo(job.company)}>{job.logo || '?'}</Logo>
          <TitleBlock>
            <Typography component="p">
              {job.company}
              {job.verified ? (
                <CheckCircleIcon aria-label={JOB_CARD_COPY.verifiedCompany} fontSize="inherit" />
              ) : null}
            </Typography>
            <Typography component="h2">{job.title}</Typography>
          </TitleBlock>
        </CompanyRow>

        <MetaRow>
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
          {job.experience.trim() ? (
            <span>
              <PersonOutlineIcon fontSize="inherit" />
              {job.experience}
            </span>
          ) : null}
          <span>
            <BusinessCenterOutlinedIcon fontSize="inherit" />
            {job.salary}
          </span>
        </MetaRow>

        {visibleSkills.length > 0 ? (
          <SkillRow>
            {visibleSkills.map((skill) => (
              <SkillChip key={skill}>{skill}</SkillChip>
            ))}
          </SkillRow>
        ) : null}
      </LeftColumn>

      <RightColumn>
        <TopRight>
          {typeof job.match === 'number' ? (
            <MatchBadge aria-label={JOB_CARD_ARIA.match(job.match)}>
              <SmartToyOutlinedIcon fontSize="inherit" />
              {job.match}
              {JOB_UI.MATCH_SUFFIX}
            </MatchBadge>
          ) : null}
          <SavedMeta>{job.postedAt}</SavedMeta>
        </TopRight>

        <ActionsRow>
          {onUnsave && job.id ? (
            <Tooltip disableInteractive placement="top" title={JOB_CARD_COPY.unsaveJob}>
              <span>
                <SaveIconButton
                  aria-label={JOB_CARD_ARIA.save(true, job.title)}
                  aria-pressed
                  onClick={(event) => {
                    event.stopPropagation();
                    onUnsave(job);
                  }}
                >
                  <BookmarkOutlinedIcon fontSize="small" />
                </SaveIconButton>
              </span>
            </Tooltip>
          ) : null}

          {canOpen ? (
            <Button
              aria-label={JOB_CARD_ARIA.viewJob(job.title)}
              endIcon={<ArrowForwardIcon fontSize="small" />}
              onClick={(event) => {
                event.stopPropagation();
                onOpen?.(job);
              }}
              size="small"
            >
              {APP_ACTIONS.VIEW_JOB}
            </Button>
          ) : null}
        </ActionsRow>
      </RightColumn>
    </CardRoot>
  );
}
