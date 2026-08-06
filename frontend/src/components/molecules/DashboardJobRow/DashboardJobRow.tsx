import type { ReactNode } from 'react';

import { Button } from '@/components/atoms/Button';

import { APP_ACTIONS, JOB_UI } from '@/constants/ui';
import { DASHBOARD_JOB_ROW_COPY, DASHBOARD_JOB_ROW_LIMITS } from '@/constants/ui';
import {
  BookmarkBorderOutlinedIcon,
  CheckCircleIcon,
  LocationOnOutlinedIcon,
  Typography,
} from '@/lib/material';

import type { JobCardData } from '../JobCard';

import {
  ActionGroup,
  CompanyLogoBox,
  DashboardJobRowRoot,
  FeaturedJobRoot,
  FeaturedSide,
  JobCopy,
  MatchBadge,
  MetaLine,
  PostedText,
  SalaryText,
  SaveAction,
  SkillChip,
  SkillList,
  TitleLine,
  VerifiedIcon,
} from './styles';

export interface DashboardJobRowProps {
  featured?: boolean;
  job: JobCardData;
  onApply?: (job: JobCardData) => void;
  onSave?: (job: JobCardData) => void;
}

export function DashboardJobRow({ featured = false, job, onApply, onSave }: DashboardJobRowProps) {
  const showMatch = typeof job.match === 'number';
  const showActions = Boolean(onApply || onSave);

  const renderTitleLine = () => (
    <TitleLine>
      <Typography component="h3">{job.title}</Typography>
      <VerifiedIcon as={CheckCircleIcon} fontSize="small" />
    </TitleLine>
  );

  const renderMetaLine = (extra?: ReactNode) => (
    <MetaLine>
      <span>
        <LocationOnOutlinedIcon fontSize="small" /> {job.location}
      </span>
      <span>{job.experience}</span>
      {extra}
    </MetaLine>
  );

  const renderSkillList = (maxSkills: number) =>
    job.skills.length ? (
      <SkillList>
        {job.skills.slice(0, maxSkills).map((skill) => (
          <SkillChip key={skill}>{skill}</SkillChip>
        ))}
      </SkillList>
    ) : null;

  const renderActions = () =>
    showActions ? (
      <ActionGroup>
        {onSave ? (
          <SaveAction
            aria-label={DASHBOARD_JOB_ROW_COPY.saveJobAria(job.title)}
            onClick={() => onSave(job)}
          >
            <BookmarkBorderOutlinedIcon fontSize="small" />
            {APP_ACTIONS.SAVE}
          </SaveAction>
        ) : null}
        {onApply ? (
          <Button onClick={() => onApply(job)} size="small">
            {APP_ACTIONS.APPLY_NOW}
          </Button>
        ) : null}
      </ActionGroup>
    ) : null;

  const renderMatchBadge = () =>
    showMatch ? (
      <MatchBadge>
        {job.match}
        {JOB_UI.MATCH_SUFFIX}
      </MatchBadge>
    ) : null;

  if (featured) {
    return (
      <FeaturedJobRoot>
        <CompanyLogoBox>{job.logo}</CompanyLogoBox>

        <JobCopy>
          {renderTitleLine()}
          <Typography component="p">{job.company}</Typography>
          {renderMetaLine()}
          {renderSkillList(DASHBOARD_JOB_ROW_LIMITS.featuredMaxSkills)}
        </JobCopy>

        <FeaturedSide>
          {renderMatchBadge()}
          <SalaryText>{job.salary}</SalaryText>
          {renderActions()}
        </FeaturedSide>
      </FeaturedJobRoot>
    );
  }

  return (
    <DashboardJobRowRoot featured={featured}>
      <CompanyLogoBox>{job.logo}</CompanyLogoBox>

      <JobCopy>
        {renderTitleLine()}
        <Typography component="p">{job.company}</Typography>
        {renderMetaLine(<span>{job.type}</span>)}
      </JobCopy>

      <SalaryText>{job.salary}</SalaryText>

      <PostedText>
        {job.postedAt.replace(DASHBOARD_JOB_ROW_COPY.postedPrefix, '')}
        <br />
        {job.type}
      </PostedText>

      {renderMatchBadge()}
      {renderSkillList(DASHBOARD_JOB_ROW_LIMITS.maxSkills)}
      {renderActions()}
    </DashboardJobRowRoot>
  );
}
