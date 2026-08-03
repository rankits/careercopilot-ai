import { useState, type KeyboardEvent } from 'react';

import { Button, Input } from '@/components/atoms';

import {
  AddIcon,
  AutoAwesomeOutlinedIcon,
  BarChartOutlinedIcon,
  Box,
  CheckCircleIcon,
  Chip,
  CloseIcon,
  DescriptionOutlinedIcon,
  DownloadIcon,
  MenuItem,
  NavigateBeforeIcon,
  NavigateNextIcon,
  Typography,
} from '@/lib/material';
import type { AnalysisResult, ResumeVersion, UploadedResume } from '@/services/resumeBuilder.service';

import { formatFileSize, formatResumeDate, getResumeExtension } from '../../utils';

import {
  DefineRoleNextButtonSx,
  DefineRoleShell,
  EmptyText,
  FileTile,
  FormInputSx,
  FormLabel,
  ScoreBadge,
} from './styles';

type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';

interface DefineRoleStepProps {
  targetRole: string;
  industry: string;
  experienceLevel: ExperienceLevel;
  employmentType: string;
  skills: string[];
  jobDescription: string;
  startingAnalysis: boolean;
  selectedResume: UploadedResume | null;
  analysis: AnalysisResult | null;
  versions: ResumeVersion[];
  onBack: () => void;
  onTargetRoleChange: (value: string) => void;
  onIndustryChange: (value: string) => void;
  onExperienceLevelChange: (value: ExperienceLevel) => void;
  onEmploymentTypeChange: (value: string) => void;
  onSkillsChange: (value: string[]) => void;
  onJobDescriptionChange: (value: string) => void;
  onStartAnalysis: () => void;
}

const nextItems = [
  { icon: BarChartOutlinedIcon, title: 'Resume analysis' },
  { icon: CheckCircleIcon, title: 'ATS score generation' },
  { icon: DescriptionOutlinedIcon, title: 'Keyword extraction' },
  { icon: AutoAwesomeOutlinedIcon, title: 'AI suggestions' },
  { icon: DownloadIcon, title: 'Resume download' },
];

export function DefineRoleStep({
  targetRole,
  industry,
  experienceLevel,
  employmentType,
  skills,
  jobDescription,
  startingAnalysis,
  selectedResume,
  analysis,
  versions,
  onBack,
  onTargetRoleChange,
  onIndustryChange,
  onExperienceLevelChange,
  onEmploymentTypeChange,
  onSkillsChange,
  onJobDescriptionChange,
  onStartAnalysis,
}: DefineRoleStepProps) {
  const [skillInput, setSkillInput] = useState('');
  const selectedResumeExtension = getResumeExtension(selectedResume?.originalName ?? '');
  const selectedResumeSize = formatFileSize(selectedResume?.sizeBytes);
  const atsScore = analysis?.status === 'COMPLETED' ? analysis.atsScore : null;

  const addSkill = () => {
    const value = skillInput.trim().replace(/,$/, '');
    if (!value) return;
    if (skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
      setSkillInput('');
      return;
    }
    onSkillsChange([...skills, value]);
    setSkillInput('');
  };

  const onSkillKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addSkill();
    }
  };

  return (
    <DefineRoleShell>
      <Box className="main">
        <Box className="section-heading">
          <Typography className="step-title" component="h2">
            Step 2: <Box component="span">Define Your Target Role</Box>
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            Add role details, skills, and an optional job description so ATS scoring matches the
            real JD.
          </Typography>
        </Box>

        <Box className="role-card">
          <Box className="form-group">
            <FormLabel>Target job title</FormLabel>
            <Input
              value={targetRole}
              onChange={(event) => onTargetRoleChange(event.target.value)}
              placeholder="e.g. Senior Frontend Developer"
              size="medium"
              sx={FormInputSx}
            />
          </Box>

          <Box className="form-group">
            <FormLabel>Industry</FormLabel>
            <Input
              select
              value={industry}
              onChange={(event) => onIndustryChange(event.target.value)}
              size="medium"
              sx={FormInputSx}
            >
              <MenuItem value="">Select industry</MenuItem>
              <MenuItem value="technology">Technology</MenuItem>
              <MenuItem value="finance">Finance</MenuItem>
              <MenuItem value="healthcare">Healthcare</MenuItem>
              <MenuItem value="education">Education</MenuItem>
              <MenuItem value="consulting">Consulting</MenuItem>
            </Input>
          </Box>

          <Box className="form-grid-two">
            <Box className="form-group">
              <FormLabel>Experience level</FormLabel>
              <Input
                select
                value={experienceLevel}
                onChange={(event) => onExperienceLevelChange(event.target.value as ExperienceLevel)}
                size="medium"
                sx={FormInputSx}
              >
                <MenuItem value="entry">Entry level</MenuItem>
                <MenuItem value="mid">Mid level</MenuItem>
                <MenuItem value="senior">Senior level</MenuItem>
                <MenuItem value="lead">Lead / Manager</MenuItem>
                <MenuItem value="executive">Executive</MenuItem>
              </Input>
            </Box>

            <Box className="form-group">
              <FormLabel>Employment type</FormLabel>
              <Input
                select
                value={employmentType}
                onChange={(event) => onEmploymentTypeChange(event.target.value)}
                size="medium"
                sx={FormInputSx}
              >
                <MenuItem value="">Select employment type</MenuItem>
                <MenuItem value="full-time">Full-time</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
                <MenuItem value="freelance">Freelance</MenuItem>
                <MenuItem value="internship">Internship</MenuItem>
              </Input>
            </Box>
          </Box>

          <Box className="form-group">
            <FormLabel>Skills (chip-wise)</FormLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
              {skills.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  color="primary"
                  variant="outlined"
                  onDelete={() => onSkillsChange(skills.filter((item) => item !== skill))}
                  deleteIcon={<CloseIcon fontSize="small" />}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Input
                value={skillInput}
                onChange={(event) => setSkillInput(event.target.value)}
                onKeyDown={onSkillKeyDown}
                placeholder="Type a skill and press Enter"
                size="medium"
                sx={FormInputSx}
              />
              <Button size="medium" startIcon={<AddIcon fontSize="small" />} onClick={addSkill}>
                Add
              </Button>
            </Box>
          </Box>

          <Box className="form-group">
            <FormLabel>Job description (for ATS match)</FormLabel>
            <Input
              value={jobDescription}
              onChange={(event) => onJobDescriptionChange(event.target.value)}
              placeholder="Paste the full job description here. ATS scoring and keywords will use this."
              size="medium"
              multiline
              minRows={6}
              sx={FormInputSx}
            />
          </Box>

          <Box className="role-tip">
            <AutoAwesomeOutlinedIcon fontSize="small" />
            <Box>
              <Typography className="tip-title">Tip</Typography>
              <Typography className="tip-text">
                Paste the real JD for strongest keyword/skill-gap analysis. Skills chips help target
                role matching even without a JD.
              </Typography>
            </Box>
            <Box className="tip-actions">
              <Button
                size="medium"
                startIcon={<NavigateBeforeIcon fontSize="small" />}
                onClick={onBack}
                variant="outline"
              >
                Back
              </Button>
              <Button
                disabled={startingAnalysis || !targetRole.trim() || !selectedResume}
                endIcon={<NavigateNextIcon fontSize="small" />}
                isLoading={startingAnalysis}
                onClick={onStartAnalysis}
                size="medium"
                sx={DefineRoleNextButtonSx}
              >
                Next
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box className="aside">
        <Box className="aside-card">
          <Typography className="aside-title">Uploaded Resume</Typography>
          {selectedResume ? (
            <>
              <Box className="uploaded-resume">
                <FileTile extension={selectedResumeExtension}>
                  <DescriptionOutlinedIcon fontSize="small" />
                  {selectedResumeExtension}
                </FileTile>
                <Box sx={{ minWidth: 0 }}>
                  <Typography className="resume-name">{selectedResume.originalName}</Typography>
                  <Typography className="resume-subtext">
                    Uploaded on {formatResumeDate(selectedResume.createdAt)}
                    {selectedResumeSize ? ` - ${selectedResumeSize}` : ''}
                  </Typography>
                </Box>
              </Box>
              <Box className="stats-grid">
                <Box>
                  <Typography className="stat-label">Status</Typography>
                  <Typography className="stat-value">{selectedResume.status}</Typography>
                </Box>
                <Box>
                  <Typography className="stat-label">ATS Score</Typography>
                  <Typography className="stat-value">
                    {atsScore === null ? 'Not analyzed' : `${atsScore}/100`}
                  </Typography>
                </Box>
              </Box>
            </>
          ) : (
            <EmptyText>Upload or select a resume before running analysis.</EmptyText>
          )}
        </Box>

        <Box className="aside-card">
          <Typography className="aside-title">What happens next?</Typography>
          <Box className="next-list">
            {nextItems.map((item) => {
              const Icon = item.icon;
              return (
                <Box key={item.title} className="next-item">
                  <Box className="next-icon">
                    <Icon fontSize="small" />
                  </Box>
                  <Typography className="next-text">{item.title}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box className="version-grid">
          {versions.length === 0 ? (
            <Box className="version-card">
              <EmptyText>No saved versions yet.</EmptyText>
            </Box>
          ) : (
            versions.map((version) => (
              <Box key={version.id} className="version-card">
                <Box className="version-header">
                  <Typography className="version-title">{version.label}</Typography>
                  <ScoreBadge score={version.atsScore}>{version.atsScore}/100</ScoreBadge>
                </Box>
                <Typography className="resume-subtext">
                  {formatResumeDate(version.createdAt)}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </DefineRoleShell>
  );
}
