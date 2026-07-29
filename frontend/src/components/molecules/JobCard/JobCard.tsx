import { Button } from '@/components/atoms/Button';

import {
  AccessTimeOutlinedIcon,
  BookmarkBorderOutlinedIcon,
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
  accent: 'primary' | 'danger';
  company: string;
  experience: string;
  experienceBand: string;
  logo: string;
  location: string;
  match: number;
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
  onApply?: (job: JobCardData) => void;
  onSave?: (job: JobCardData) => void;
}

export function JobCard({ job, onApply, onSave }: JobCardProps) {
  return (
    <JobCardRoot>
      <Accent tone={job.accent} />
      <CompanyLogo>{job.logo}</CompanyLogo>

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
          </div>
          <VerifiedIcon fontSize="small" />
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

        <SkillList>
          {job.skills.map((skill) => (
            <SkillPill key={skill}>{skill}</SkillPill>
          ))}
        </SkillList>
      </JobDetails>

      <JobActions>
        <MatchPill>
          {job.match}% Match
          <MatchRing aria-hidden="true" />
        </MatchPill>
        <SaveButton aria-label={`Save ${job.title}`} onClick={() => onSave?.(job)}>
          <BookmarkBorderOutlinedIcon fontSize="small" />
        </SaveButton>
        <Button onClick={() => onApply?.(job)} size="small" variant="outline">
          Apply Now
        </Button>
      </JobActions>
    </JobCardRoot>
  );
}
