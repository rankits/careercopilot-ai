import { useState, type DragEvent, type RefObject } from 'react';

import { Button } from '@/components/atoms';

import {
  AutoAwesomeOutlinedIcon,
  Box,
  CheckIcon,
  CircularProgress,
  CloudUploadOutlinedIcon,
  DescriptionOutlinedIcon,
  LightbulbOutlinedIcon,
  SearchOutlinedIcon,
  Typography,
  WorkOutlineOutlinedIcon,
} from '@/lib/material';
import type {
  AnalysisResult,
  KeywordsResponse,
  RecheckResult,
  ResumeVersion,
  SuggestionItem,
  UploadedResume,
} from '@/services/resumeBuilder.service';

import type { ResumeBuilderStep as Step } from '../../constants';
import {
  formatFileSize,
  formatResumeDate,
  getResumeExtension,
  type ResumeTemplateId,
} from '../../utils';
import { DefineRoleStep } from '../DefineRoleStep';
import { ExportStep } from '../ExportStep';
import { OptimizeStep } from '../OptimizeStep';
import { UploadStep } from '../UploadStep';

import {
  AnalysisLoadingGlow,
  AnalysisMain,
  AnalysisRangeMarker,
  AnalysisScoreTrackSx,
  AnalysisShell,
  CardSubtitle,
  EmptyText,
  FileTile,
  KeywordChip,
  ToneCountBadge,
  ToneIconBox,
  analysisScoreProgressSx,
} from './styles';

interface AnalysisDashboardProps {
  analysis: AnalysisResult | null;
  employmentType: string;
  experienceLevel: string;
  industry: string;
  isComplete: boolean;
  selectedResume: UploadedResume | null;
  suggestions: SuggestionItem[];
  targetRole: string;
  onContinue: () => void;
  onReanalyze: () => void;
  onReplaceResume: () => void;
}

function scoreBandLabel(score?: number): string {
  if (score == null) return 'Analyzing';
  if (score >= 75) return 'Excellent Match';
  if (score >= 50) return 'Good Match';
  return 'Needs Work';
}

function AnalysisDashboard({
  analysis,
  employmentType,
  experienceLevel,
  industry,
  isComplete,
  selectedResume,
  suggestions,
  targetRole,
  onContinue,
  onReanalyze,
  onReplaceResume,
}: AnalysisDashboardProps) {
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<number>>(new Set());
  const missingKeywords = isComplete
    ? (analysis?.keywords.filter((keyword) => keyword.status === 'MISSING') ?? [])
    : [];
  const matchedKeywords = isComplete
    ? (analysis?.keywords.filter((keyword) => keyword.status === 'MATCHED') ?? [])
    : [];
  const activeSuggestions = isComplete
    ? suggestions.length > 0
      ? suggestions
      : (analysis?.suggestions ?? [])
    : [];
  const weaknesses = isComplete ? (analysis?.weaknesses ?? []) : [];
  const strengths = isComplete ? (analysis?.strengths ?? []) : [];
  const atsIssues = isComplete ? (analysis?.atsIssues ?? []) : [];
  const skillAnalysis = analysis?.skillAnalysis;
  const sectionScores = analysis?.sectionScores;
  const score = isComplete ? analysis?.atsScore : undefined;
  const resumeExtension = getResumeExtension(selectedResume?.originalName ?? '');
  const resumeSize = formatFileSize(selectedResume?.sizeBytes);

  const metrics = [
    { label: 'Keyword Match', value: analysis?.keywordMatch },
    { label: 'Skill Match', value: analysis?.skillMatch },
    { label: 'Content Quality', value: analysis?.contentQuality },
    { label: 'Readability', value: analysis?.readability },
    { label: 'Formatting', value: analysis?.formattingScore },
  ];

  const sectionEntries = sectionScores
    ? Object.entries(sectionScores)
    : [
        ['summary', 0],
        ['experience', 0],
        ['skills', 0],
        ['education', 0],
        ['projects', 0],
        ['achievements', 0],
      ];

  const toggleKeyword = (keywordId: number) => {
    setSelectedKeywordIds((current) => {
      const next = new Set(current);
      if (next.has(keywordId)) next.delete(keywordId);
      else next.add(keywordId);
      return next;
    });
  };

  return (
    <AnalysisShell>
      <AnalysisMain loading={!isComplete}>
        {!isComplete && <AnalysisLoadingGlow className="analysis-loading-glow" />}
        <Box className="heading">
          <Box>
            <Typography className="step-title" component="h2">
              Step 3: <Box component="span">ATS Analysis & Skill Gaps</Box>
            </Typography>
            <CardSubtitle>
              Factual ATS scoring against your target role — keywords, skills, section quality, and
              formatting issues.
            </CardSubtitle>
          </Box>
          <Button
            size="small"
            startIcon={<LightbulbOutlinedIcon fontSize="small" />}
            variant="ghost"
          >
            How does analysis work?
          </Button>
        </Box>

        <Box className="score-card">
          <Box className="score-block">
            <Typography className="card-title">ATS Score</Typography>
            <Box className="score-ring">
              <CircularProgress
                size={176}
                thickness={4}
                value={100}
                variant="determinate"
                sx={AnalysisScoreTrackSx}
              />
              <CircularProgress
                size={176}
                thickness={4}
                value={score}
                variant={score != null ? 'determinate' : 'indeterminate'}
                sx={analysisScoreProgressSx(score != null)}
              />
              <Box className="score-value">
                <Typography className="score-number">
                  {score ?? '--'}
                  <Box component="span">/100</Box>
                </Typography>
                <Typography className="score-label">{scoreBandLabel(score)}</Typography>
              </Box>
            </Box>
          </Box>

          <Box className="score-summary">
            <Box className="score-topline">
              <Box>
                <Typography className="summary-title">
                  {score != null
                    ? score >= 75
                      ? 'Strong ATS foundation — refine weak sections next.'
                      : score >= 50
                        ? 'Solid base — close skill and keyword gaps to climb.'
                        : 'Significant gaps vs the target role.'
                    : 'Analysis is running'}
                </Typography>
                <CardSubtitle>
                  {score != null
                    ? `Optimized for ${targetRole || 'your target role'}. Suggestions never invent skills you do not have.`
                    : 'Checking keywords, skill gaps, section scores, readability, and ATS issues.'}
                </CardSubtitle>
              </Box>
              <Button
                size="small"
                startIcon={<SearchOutlinedIcon fontSize="small" />}
                variant="outline"
                onClick={onReanalyze}
              >
                Re-analyze
              </Button>
            </Box>
            <Box className="range">
              <Box className="range-bar">
                <AnalysisRangeMarker score={score ?? 25} />
              </Box>
              <Box className="range-numbers">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </Box>
              <Box className="legend">
                <Box>
                  <span className="needs" />
                  Needs Work
                  <br />
                  <small>0-49</small>
                </Box>
                <Box>
                  <span className="good" />
                  Good
                  <br />
                  <small>50-74</small>
                </Box>
                <Box>
                  <span className="excellent" />
                  Excellent
                  <br />
                  <small>75-100</small>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box className="metrics-grid">
          {metrics.map((metric) => (
            <Box key={metric.label} className="metric-card">
              <Typography className="metric-label">{metric.label}</Typography>
              <Typography className="metric-value">
                {isComplete && metric.value != null ? metric.value : '--'}
              </Typography>
              <Box className="metric-track">
                <Box
                  className="metric-fill"
                  style={{ width: `${isComplete && metric.value != null ? metric.value : 12}%` }}
                />
              </Box>
            </Box>
          ))}
        </Box>

        <Box className="detail-grid">
          <Box className="insight-card">
            <Typography className="card-title">Section Scores</Typography>
            <CardSubtitle>How each resume section performs for the target role.</CardSubtitle>
            <Box className="section-scores">
              {sectionEntries.map(([name, value]) => (
                <Box key={name} className="section-row">
                  <Typography className="section-name">{name}</Typography>
                  <Box className="metric-track">
                    <Box
                      className="metric-fill"
                      style={{ width: `${isComplete ? Number(value) : 10}%` }}
                    />
                  </Box>
                  <Typography className="section-value">
                    {isComplete ? Number(value) : '--'}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box className="insight-card">
            <Typography className="card-title">Skill Gap Analysis</Typography>
            <CardSubtitle>
              Matched skills stay on your resume. Missing skills are recommendations only.
            </CardSubtitle>
            <Box className="skill-columns">
              <Box className="skill-group">
                <Typography className="skill-group-title">Matched</Typography>
                <Box className="keyword-wrap">
                  {(skillAnalysis?.matchedSkills ?? []).slice(0, 8).map((skill) => (
                    <KeywordChip key={skill} selected component="span">
                      {skill}
                    </KeywordChip>
                  ))}
                  {isComplete && (skillAnalysis?.matchedSkills?.length ?? 0) === 0 && (
                    <EmptyText>No matched skills listed.</EmptyText>
                  )}
                </Box>
              </Box>
              <Box className="skill-group">
                <Typography className="skill-group-title">Missing / Recommended</Typography>
                <Box className="keyword-wrap">
                  {[
                    ...(skillAnalysis?.missingSkills ?? []),
                    ...(skillAnalysis?.recommendedSkills ?? []),
                  ]
                    .slice(0, 8)
                    .map((skill) => (
                      <KeywordChip key={skill} component="span">
                        {skill}
                      </KeywordChip>
                    ))}
                  {isComplete &&
                    (skillAnalysis?.missingSkills?.length ?? 0) +
                      (skillAnalysis?.recommendedSkills?.length ?? 0) ===
                      0 && <EmptyText>No skill gaps found.</EmptyText>}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box className="insight-grid">
          <Box className="insight-card">
            <Box className="insight-header">
              <ToneIconBox tone="error">
                <SearchOutlinedIcon fontSize="small" />
              </ToneIconBox>
              <Typography className="card-title">Missing Keywords</Typography>
              <ToneCountBadge tone="error">{missingKeywords.length}</ToneCountBadge>
            </Box>
            <CardSubtitle>
              {matchedKeywords.length} matched · add missing terms only where factual.
            </CardSubtitle>
            <Box className="keyword-wrap">
              {missingKeywords.slice(0, 8).map((keyword) => (
                <KeywordChip
                  key={keyword.id}
                  component="button"
                  selected={selectedKeywordIds.has(keyword.id)}
                  title={keyword.reason}
                  onClick={() => toggleKeyword(keyword.id)}
                >
                  {selectedKeywordIds.has(keyword.id) && <CheckIcon fontSize="small" />}
                  {keyword.term}
                </KeywordChip>
              ))}
              {missingKeywords.length === 0 && (
                <EmptyText>
                  {isComplete ? 'No missing keywords found.' : 'Keywords are being extracted.'}
                </EmptyText>
              )}
            </Box>
          </Box>

          <Box className="insight-card">
            <Box className="insight-header">
              <ToneIconBox tone="warning">
                <LightbulbOutlinedIcon fontSize="small" />
              </ToneIconBox>
              <Typography className="card-title">ATS Issues</Typography>
              <ToneCountBadge tone="warning">
                {atsIssues.length || weaknesses.length}
              </ToneCountBadge>
            </Box>
            <Box className="issue-list">
              {atsIssues.slice(0, 4).map((issue) => (
                <Box key={`${issue.section}-${issue.issue}`} className="issue-item">
                  <Box className="issue-top">
                    <Typography className="issue-title">{issue.issue}</Typography>
                    <Box
                      className={`severity severity-${issue.severity.toLowerCase()}`}
                      component="span"
                    >
                      {issue.severity}
                    </Box>
                  </Box>
                  <Typography className="issue-fix">
                    {issue.section}: {issue.fix}
                  </Typography>
                </Box>
              ))}
              {atsIssues.length === 0 &&
                weaknesses.slice(0, 4).map((issue) => (
                  <Typography key={issue} className="bullet">
                    <Box className="error" component="span">
                      x
                    </Box>
                    {issue}
                  </Typography>
                ))}
              {atsIssues.length === 0 && weaknesses.length === 0 && (
                <EmptyText>
                  {isComplete ? 'No ATS issues found.' : 'Issues are being checked.'}
                </EmptyText>
              )}
            </Box>
          </Box>

          <Box className="insight-card">
            <Box className="insight-header">
              <ToneIconBox tone="success">
                <LightbulbOutlinedIcon fontSize="small" />
              </ToneIconBox>
              <Typography className="card-title">Strengths & Fixes</Typography>
              <ToneCountBadge tone="success">{activeSuggestions.length}</ToneCountBadge>
            </Box>
            <Box className="bullet-list">
              {strengths.slice(0, 3).map((item) => (
                <Typography key={item} className="bullet">
                  <CheckIcon fontSize="small" />
                  {item}
                </Typography>
              ))}
              {activeSuggestions.slice(0, 4).map((suggestion) => (
                <Typography key={suggestion.id} className="bullet">
                  <AutoAwesomeOutlinedIcon fontSize="small" />
                  {suggestion.title}
                </Typography>
              ))}
              {strengths.length === 0 && activeSuggestions.length === 0 && (
                <EmptyText>
                  {isComplete ? 'No suggestions yet.' : 'Suggestions are being generated.'}
                </EmptyText>
              )}
            </Box>
          </Box>
        </Box>

        <Box className="progress-notice">
          <AutoAwesomeOutlinedIcon />
          <Box>
            <Typography className="tip-title">
              {isComplete
                ? 'Next: apply fact-preserving AI fixes section by section.'
                : 'Our AI is scoring ATS fit, skill gaps, and rewrite-ready suggestions.'}
            </Typography>
            <Typography className="tip-text">
              Original resume content is preserved. Missing skills are never added as if you have
              them.
            </Typography>
          </Box>
          <Button
            isLoading={!isComplete}
            size="small"
            onClick={onContinue}
            variant={isComplete ? 'solid' : 'outline'}
          >
            {isComplete ? 'Optimize resume' : 'Analysis in progress...'}
          </Button>
        </Box>
      </AnalysisMain>

      <Box className="aside">
        <Box className="aside-card">
          <Typography className="aside-title">Uploaded Resume</Typography>
          {selectedResume && (
            <Box className="uploaded-resume">
              <FileTile extension={resumeExtension}>
                <DescriptionOutlinedIcon fontSize="small" />
                {resumeExtension}
              </FileTile>
              <Box sx={{ minWidth: 0 }}>
                <Typography className="resume-name">{selectedResume.originalName}</Typography>
                <Typography className="resume-subtext">
                  Uploaded on {formatResumeDate(selectedResume.createdAt)}
                  {resumeSize ? ` - ${resumeSize}` : ''}
                </Typography>
              </Box>
            </Box>
          )}
          <Button
            size="small"
            startIcon={<CloudUploadOutlinedIcon fontSize="small" />}
            variant="outline"
            onClick={onReplaceResume}
          >
            Replace Resume
          </Button>
        </Box>

        <Box className="aside-card">
          <Box className="aside-title-row">
            <Typography className="aside-title">Target Role</Typography>
            <Button size="extraSmall" variant="ghost">
              Edit
            </Button>
          </Box>
          <Box className="next-item">
            <Box className="next-icon">
              <WorkOutlineOutlinedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography className="next-text">{targetRole || 'Target role'}</Typography>
              <Typography className="resume-subtext">
                {[employmentType, experienceLevel && `${experienceLevel} exp`, industry]
                  .filter(Boolean)
                  .join(' - ') || 'Role details pending'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </AnalysisShell>
  );
}

interface ResumeBuilderStepPanelsProps {
  step: Step;
  existingResumes: UploadedResume[];
  selectedResume: UploadedResume | null;
  isDragging: boolean;
  uploadError: string;
  uploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  targetRole: string;
  industry: string;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  employmentType: string;
  skills: string[];
  jobDescription: string;
  startingAnalysis: boolean;
  analysis: AnalysisResult | null;
  keywords: KeywordsResponse | null;
  suggestions: SuggestionItem[];
  applyingId: number | null;
  editedContent: string;
  saving: boolean;
  recheckResult: RecheckResult | null;
  rechecking: boolean;
  exporting: boolean;
  versions: ResumeVersion[];
  savingVersion: boolean;
  selectedTemplate: ResumeTemplateId;
  onDragStateChange: (dragging: boolean) => void;
  onDrop: (event: DragEvent) => void;
  onFileSelect: (file: File) => void;
  onUseResume: (resume: UploadedResume) => void;
  onTargetRoleChange: (value: string) => void;
  onIndustryChange: (value: string) => void;
  onExperienceLevelChange: (value: 'entry' | 'mid' | 'senior' | 'lead' | 'executive') => void;
  onEmploymentTypeChange: (value: string) => void;
  onSkillsChange: (value: string[]) => void;
  onJobDescriptionChange: (value: string) => void;
  onStartAnalysis: () => void;
  onBackFromDefineRole: () => void;
  onReplaceResume: () => void;
  onGoTo: (step: Step) => void;
  onApplySuggestion: (id: number) => void;
  onIgnoreSuggestion: (id: number) => void;
  onEditedContentChange: (value: string) => void;
  onSaveContent: () => void;
  onPreviewResume: () => void;
  onExport: (format: 'pdf' | 'docx' | 'txt') => void;
  onSaveVersion: () => void;
  onDone: () => void;
  onTemplateChange: (template: ResumeTemplateId) => void;
}

export function ResumeBuilderStepPanels({
  step,
  existingResumes,
  selectedResume,
  isDragging,
  uploadError,
  uploading,
  fileInputRef,
  targetRole,
  industry,
  experienceLevel,
  employmentType,
  skills,
  jobDescription,
  startingAnalysis,
  analysis,
  keywords: _keywords,
  suggestions,
  applyingId,
  editedContent,
  saving,
  recheckResult,
  rechecking,
  exporting,
  versions,
  savingVersion,
  selectedTemplate,
  onDragStateChange,
  onDrop,
  onFileSelect,
  onUseResume,
  onTargetRoleChange,
  onIndustryChange,
  onExperienceLevelChange,
  onEmploymentTypeChange,
  onSkillsChange,
  onJobDescriptionChange,
  onStartAnalysis,
  onBackFromDefineRole,
  onReplaceResume,
  onGoTo,
  onApplySuggestion,
  onIgnoreSuggestion,
  onEditedContentChange,
  onSaveContent,
  onPreviewResume: _onPreviewResume,
  onExport,
  onSaveVersion,
  onDone,
  onTemplateChange,
}: ResumeBuilderStepPanelsProps) {
  void _keywords;
  void _onPreviewResume;

  return (
    <>
      {step === 1 && (
        <UploadStep
          existingResumes={existingResumes}
          fileInputRef={fileInputRef}
          isDragging={isDragging}
          uploadError={uploadError}
          uploading={uploading}
          onDragStateChange={onDragStateChange}
          onDrop={onDrop}
          onFileSelect={onFileSelect}
          onUseResume={onUseResume}
        />
      )}
      {step === 2 && (
        <DefineRoleStep
          targetRole={targetRole}
          industry={industry}
          experienceLevel={experienceLevel}
          employmentType={employmentType}
          skills={skills}
          jobDescription={jobDescription}
          startingAnalysis={startingAnalysis}
          selectedResume={selectedResume}
          analysis={analysis}
          versions={versions}
          onBack={onBackFromDefineRole}
          onTargetRoleChange={onTargetRoleChange}
          onIndustryChange={onIndustryChange}
          onExperienceLevelChange={onExperienceLevelChange}
          onEmploymentTypeChange={onEmploymentTypeChange}
          onSkillsChange={onSkillsChange}
          onJobDescriptionChange={onJobDescriptionChange}
          onStartAnalysis={onStartAnalysis}
        />
      )}
      {step === 3 && (
        <AnalysisDashboard
          analysis={analysis}
          employmentType={employmentType}
          experienceLevel={experienceLevel}
          industry={industry}
          isComplete={false}
          selectedResume={selectedResume}
          suggestions={suggestions}
          targetRole={targetRole}
          onContinue={() => undefined}
          onReanalyze={onStartAnalysis}
          onReplaceResume={onReplaceResume}
        />
      )}
      {step === 4 && analysis && (
        <AnalysisDashboard
          analysis={analysis}
          employmentType={employmentType}
          experienceLevel={experienceLevel}
          industry={industry}
          isComplete
          selectedResume={selectedResume}
          suggestions={suggestions}
          targetRole={analysis.targetRole || targetRole}
          onContinue={() => onGoTo(5)}
          onReanalyze={onStartAnalysis}
          onReplaceResume={onReplaceResume}
        />
      )}
      {step === 5 && (
        <OptimizeStep
          analysis={analysis}
          applyingId={applyingId}
          editedContent={editedContent}
          jobDescription={jobDescription}
          preferredSkills={skills}
          saving={saving}
          suggestions={suggestions.length > 0 ? suggestions : (analysis?.suggestions ?? [])}
          targetRole={targetRole}
          template={selectedTemplate}
          onApplySuggestion={onApplySuggestion}
          onIgnoreSuggestion={onIgnoreSuggestion}
          onEditedContentChange={onEditedContentChange}
          onExportStep={() => onGoTo(10)}
          onSaveContent={onSaveContent}
          onTemplateChange={onTemplateChange}
        />
      )}

      {step === 10 && (
        <ExportStep
          analysis={analysis}
          editedContent={editedContent}
          exporting={exporting}
          jobDescription={jobDescription}
          preferredSkills={skills}
          recheckResult={recheckResult}
          rechecking={rechecking}
          savingVersion={savingVersion}
          targetRole={targetRole}
          template={selectedTemplate}
          versions={versions}
          onBack={() => onGoTo(5)}
          onDone={onDone}
          onExport={onExport}
          onSaveVersion={onSaveVersion}
          onTemplateChange={onTemplateChange}
        />
      )}
    </>
  );
}
