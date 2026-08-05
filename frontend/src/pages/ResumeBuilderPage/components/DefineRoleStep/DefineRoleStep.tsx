import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';

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
import type {
  AnalysisResult,
  ResumeVersion,
  UploadedResume,
} from '@/services/resumeBuilder.service';
import { resumeBuilderService } from '@/services/resumeBuilder.service';
import { colorTokens } from '@/tokens';

import {
  extractKeywordsFromText,
  formatFileSize,
  formatResumeDate,
  getResumeExtension,
} from '../../utils';

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

function skillKey(value: string) {
  return value.trim().toLowerCase();
}

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
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  const selectedResumeExtension = getResumeExtension(selectedResume?.originalName ?? '');
  const selectedResumeSize = formatFileSize(selectedResume?.sizeBytes);
  const atsScore = analysis?.status === 'COMPLETED' ? analysis.atsScore : null;

  const targetRoleError = showValidation && !targetRole.trim();
  const jobDescriptionError = showValidation && !jobDescription.trim();

  useEffect(() => {
    let cancelled = false;
    if (!selectedResume?.id) {
      setResumeSkills([]);
      return undefined;
    }

    void resumeBuilderService.getResumeSkillHints(selectedResume.id).then((hints) => {
      if (!cancelled) setResumeSkills(hints);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedResume?.id]);

  const jdSkillPreview = useMemo(() => {
    const jdSkills = extractKeywordsFromText(jobDescription);
    const present = new Set(
      [...resumeSkills, ...skills].map(skillKey).filter(Boolean),
    );
    return jdSkills.map((skill) => ({
      skill,
      matched: present.has(skillKey(skill)),
    }));
  }, [jobDescription, resumeSkills, skills]);

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

  const handleNext = () => {
    if (!targetRole.trim() || !jobDescription.trim() || !selectedResume) {
      setShowValidation(true);
      return;
    }
    onStartAnalysis();
  };

  return (
    <DefineRoleShell>
      <Box className="main">
        <Box className="section-heading">
          <Typography className="step-title" component="h2">
            Step 2: <Box component="span">Define Your Target Role</Box>
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            Add role details and paste the job description so ATS scoring matches the real JD.
          </Typography>
        </Box>

        <Box className="role-card">
          <Box className="form-group">
            <FormLabel>Target job title *</FormLabel>
            <Input
              value={targetRole}
              onChange={(event) => onTargetRoleChange(event.target.value)}
              placeholder="e.g. Senior Frontend Developer"
              size="medium"
              sx={FormInputSx}
              errorMessage={targetRoleError ? 'Target role is required.' : undefined}
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
            <FormLabel>Job description *</FormLabel>
            <Input
              value={jobDescription}
              onChange={(event) => onJobDescriptionChange(event.target.value)}
              placeholder="Paste the full job description here. ATS scoring and keywords will use this."
              size="medium"
              multiline
              minRows={6}
              sx={FormInputSx}
              errorMessage={jobDescriptionError ? 'Job description is required.' : undefined}
            />
          </Box>

          {jdSkillPreview.length > 0 ? (
            <Box className="form-group">
              <FormLabel>JD skill preview</FormLabel>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem', mb: 1 }}>
                Green chips are already on your resume or preferred skills. Others are likely gaps.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {jdSkillPreview.map(({ skill, matched }) => (
                  <Chip
                    key={skill}
                    label={skill}
                    size="small"
                    sx={
                      matched
                        ? {
                            backgroundColor: colorTokens.actionSuccessSurface,
                            border: `1px solid ${colorTokens.actionSuccess}`,
                            color: colorTokens.actionSuccessHover,
                            fontWeight: 600,
                          }
                        : {
                            backgroundColor: colorTokens.backgroundCard,
                            border: `1px solid ${colorTokens.borderDefault}`,
                            color: colorTokens.textSecondary,
                          }
                    }
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          ) : null}

          <Box className="role-actions">
            <Button
              size="medium"
              startIcon={<NavigateBeforeIcon fontSize="small" />}
              onClick={onBack}
              variant="outline"
            >
              Back
            </Button>
            <Button
              disabled={startingAnalysis || !selectedResume}
              endIcon={<NavigateNextIcon fontSize="small" />}
              isLoading={startingAnalysis}
              onClick={handleNext}
              size="medium"
              sx={DefineRoleNextButtonSx}
            >
              Next
            </Button>
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
