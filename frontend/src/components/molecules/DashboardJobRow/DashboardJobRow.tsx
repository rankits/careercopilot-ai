import { Button } from '@/components/atoms/Button';

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

  if (featured) {
    return (
      <FeaturedJobRoot>
        <CompanyLogoBox>{job.logo}</CompanyLogoBox>

        <JobCopy>
          <TitleLine>
            <Typography component="h3">{job.title}</Typography>
            <VerifiedIcon as={CheckCircleIcon} fontSize="small" />
          </TitleLine>
          <Typography component="p">{job.company}</Typography>
          <MetaLine>
            <span>
              <LocationOnOutlinedIcon fontSize="small" /> {job.location}
            </span>
            <span>{job.experience}</span>
          </MetaLine>
          <SkillList>
            {job.skills.slice(0, 5).map((skill) => (
              <SkillChip key={skill}>{skill}</SkillChip>
            ))}
          </SkillList>
        </JobCopy>

        <FeaturedSide>
          {showMatch ? <MatchBadge>{job.match}% Match</MatchBadge> : null}
          <SalaryText>{job.salary}</SalaryText>
          {showActions ? (
            <ActionGroup>
              {onSave ? (
                <SaveAction aria-label={`Save ${job.title}`} onClick={() => onSave(job)}>
                  <BookmarkBorderOutlinedIcon fontSize="small" />
                  Save
                </SaveAction>
              ) : null}
              {onApply ? (
                <Button onClick={() => onApply(job)} size="small">
                  Apply Now
                </Button>
              ) : null}
            </ActionGroup>
          ) : null}
        </FeaturedSide>
      </FeaturedJobRoot>
    );
  }

  return (
    <DashboardJobRowRoot featured={featured}>
      <CompanyLogoBox>{job.logo}</CompanyLogoBox>

      <JobCopy>
        <TitleLine>
          <Typography component="h3">{job.title}</Typography>
          <VerifiedIcon as={CheckCircleIcon} fontSize="small" />
        </TitleLine>
        <Typography component="p">{job.company}</Typography>
        <MetaLine>
          <span>
            <LocationOnOutlinedIcon fontSize="small" /> {job.location}
          </span>
          <span>{job.experience}</span>
          <span>{job.type}</span>
        </MetaLine>
      </JobCopy>

      <SalaryText>{job.salary}</SalaryText>

      <PostedText>
        {job.postedAt.replace('Posted ', '')}
        <br />
        {job.type}
      </PostedText>

      {showMatch ? <MatchBadge>{job.match}% Match</MatchBadge> : null}

      <SkillList>
        {job.skills.slice(0, 4).map((skill) => (
          <SkillChip key={skill}>{skill}</SkillChip>
        ))}
      </SkillList>

      {showActions ? (
        <ActionGroup>
          {onSave ? (
            <SaveAction aria-label={`Save ${job.title}`} onClick={() => onSave(job)}>
              <BookmarkBorderOutlinedIcon fontSize="small" />
              Save
            </SaveAction>
          ) : null}
          {onApply ? (
            <Button onClick={() => onApply(job)} size="small">
              Apply Now
            </Button>
          ) : null}
        </ActionGroup>
      ) : null}
    </DashboardJobRowRoot>
  );
}
