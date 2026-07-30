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
          <MatchBadge>97% Match</MatchBadge>
          <SalaryText>{job.salary}</SalaryText>
          <ActionGroup>
            <SaveAction aria-label={`Save ${job.title}`} onClick={() => onSave?.(job)}>
              <BookmarkBorderOutlinedIcon fontSize="small" />
              Save
            </SaveAction>
            <Button onClick={() => onApply?.(job)} size="small">
              Apply Now
            </Button>
          </ActionGroup>
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
          {!featured ? <span>{job.type}</span> : null}
        </MetaLine>
      </JobCopy>

      <SalaryText>{job.salary}</SalaryText>

      {!featured ? (
        <PostedText>
          {job.postedAt.replace('Posted ', '')}
          <br />
          {job.type}
        </PostedText>
      ) : null}

      <MatchBadge>{featured ? 97 : job.match}% Match</MatchBadge>

      <SkillList>
        {job.skills.slice(0, featured ? 5 : 4).map((skill) => (
          <SkillChip key={skill}>{skill}</SkillChip>
        ))}
      </SkillList>

      <ActionGroup>
        <SaveAction aria-label={`Save ${job.title}`} onClick={() => onSave?.(job)}>
          <BookmarkBorderOutlinedIcon fontSize="small" />
          Save
        </SaveAction>
        <Button onClick={() => onApply?.(job)} size="small">
          Apply Now
        </Button>
      </ActionGroup>
    </DashboardJobRowRoot>
  );
}
