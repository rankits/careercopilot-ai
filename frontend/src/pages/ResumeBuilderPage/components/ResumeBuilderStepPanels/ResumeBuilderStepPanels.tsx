import { useEffect, useState, type DragEvent, type RefObject } from 'react';

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
} from '@/lib/material';
import type {
  AnalysisResult,
  KeywordsResponse,
  RecheckResult,
  ResumeVersion,
  SuggestionItem,
  UploadedResume,
} from '@/services/resumeBuilder.service';

import { ANALYSIS_LOADING_MESSAGES, type ResumeBuilderStep as Step } from '../../constants';
import {
  formatFileSize,
  formatResumeDate,
  getResumeExtension,
  type LiveSkillAnalysis,
  type ResumeTemplateId,
} from '../../utils';
import { DefineRoleStep } from '../DefineRoleStep';
import { ExportStep } from '../ExportStep';
import { OptimizeStep } from '../OptimizeStep';
import { UploadStep } from '../UploadStep';

import { AnalysisGateBanner } from './AnalysisGateBanner';
import { getAnalyzeGateUi } from './analyzeGateUi';
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
  editedContent?: string;
  isComplete: boolean;
  selectedResume: UploadedResume | null;
  suggestions: SuggestionItem[];
  targetRole: string;
  onContinue: () => void;
  onEditTarget: () => void;
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
  editedContent: _editedContent = '',
  isComplete,
  selectedResume,
  suggestions,
  targetRole,
  onContinue,
  onEditTarget,
  onReanalyze,
  onReplaceResume,
}: AnalysisDashboardProps) {
  void _editedContent;
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<number>>(new Set());
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    if (isComplete) return undefined;
    setLoadingMessageIndex(0);
    const timer = window.setInterval(() => {
      setLoadingMessageIndex((current) => (current + 1) % ANALYSIS_LOADING_MESSAGES.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [isComplete, analysis?.id]);

  const loadingMessage =
    ANALYSIS_LOADING_MESSAGES[loadingMessageIndex] ?? ANALYSIS_LOADING_MESSAGES[0];
  const gate = getAnalyzeGateUi({ analysis, isComplete, targetRole, loadingMessage });
  const blockedFromOptimize = gate.kind != null;

  // Step 3: trust AI semantic skillAnalysis from the server (no chip re-parse).
  const skillAnalysis = analysis?.skillAnalysis;
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
  const score = isComplete ? analysis?.atsScore : undefined;
  const resumeExtension = getResumeExtension(selectedResume?.originalName ?? '');
  const resumeSize = formatFileSize(selectedResume?.sizeBytes);

  const SECTION_ORDER = [
    'summary',
    'experience',
    'skills',
    'education',
    'projects',
    'achievements',
  ] as const;
  const sectionEntries = SECTION_ORDER.map((name) => [
    name,
    isComplete ? Math.round(Number(analysis?.sectionScores?.[name] ?? 0)) : 0,
  ]);

  const metrics = [
    { label: 'Keyword Match', value: analysis?.keywordMatch },
    { label: 'Skill Match', value: analysis?.skillMatch },
    { label: 'Content Quality', value: analysis?.contentQuality },
    { label: 'Readability', value: analysis?.readability },
    { label: 'Formatting', value: analysis?.formattingScore },
  ];

  const toggleKeyword = (keywordId: number) => {
    setSelectedKeywordIds((current) => {
      const next = new Set(current);
      if (next.has(keywordId)) next.delete(keywordId);
      else next.add(keywordId);
      return next;
    });
  };

  const runGateCta = () => {
    if (gate.ctaAction === 'edit_target') onEditTarget();
    else if (gate.ctaAction === 'replace_resume') onReplaceResume();
    else onContinue();
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
            <CardSubtitle>{gate.subtitle}</CardSubtitle>
          </Box>
        </Box>

        {gate.kind === 'invalid_target' ? (
          <AnalysisGateBanner
            title={gate.bannerTitle}
            body={gate.bannerBody}
            primary={{ label: 'Edit Target Role & JD', onClick: onEditTarget }}
            secondary={{ label: 'Re-check ATS', onClick: onReanalyze, variant: 'outline' }}
          />
        ) : null}

        {gate.kind === 'low_match' ? (
          <AnalysisGateBanner
            title={gate.bannerTitle}
            body={gate.bannerBody}
            primary={{ label: 'Continue to Optimize anyway', onClick: onContinue }}
            secondary={{
              label: 'Upload another resume',
              onClick: onReplaceResume,
              variant: 'outline',
            }}
          />
        ) : null}

        {!isComplete ? (
          <Box
            sx={{
              alignItems: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              py: 2,
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                color: 'primary.main',
                fontSize: '1rem',
                fontWeight: 700,
                minHeight: '1.5rem',
              }}
            >
              {loadingMessage}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', maxWidth: '36rem' }}>
              Hang tight — we are parsing your resume, matching it to the job description, and
              preparing AI improvement suggestions.
            </Typography>
          </Box>
        ) : null}

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
                  {gate.kind === 'invalid_target'
                    ? 'Fix Target Role and JD to get a real ATS score.'
                    : gate.kind === 'low_match'
                      ? 'Match is too low to continue — change resume or field.'
                      : score != null
                        ? score >= 75
                          ? 'Strong ATS foundation — refine weak sections next.'
                          : score >= 50
                            ? 'Solid base — close skill and keyword gaps to climb.'
                            : 'Significant gaps vs the target role.'
                        : 'Analysis is running'}
                </Typography>
                <CardSubtitle>
                  {gate.kind === 'invalid_target'
                    ? 'Update the role and job description on the previous step, then re-analyze.'
                    : gate.kind === 'low_match'
                      ? 'Upload a related-field resume or adjust Target Role / JD, then re-analyze.'
                      : score != null
                        ? `Optimized for ${targetRole || 'your target role'}. Suggestions never invent skills you do not have.`
                        : 'Checking keywords, skill gaps, section scores, readability, and ATS issues.'}
                </CardSubtitle>
              </Box>
              <Button
                size="small"
                startIcon={<SearchOutlinedIcon fontSize="small" />}
                sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
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
              AI semantic match vs JD (synonyms count). Missing skills are recommendations only.
            </CardSubtitle>
            <Box className="skill-columns">
              <Box className="skill-group">
                <Typography className="skill-group-title">Matched</Typography>
                <Box className="keyword-wrap">
                  {(skillAnalysis?.matchedSkills ?? []).map((skill) => (
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
                    ...(skillAnalysis?.missingSkills ?? []).map((skill) => ({
                      skill,
                      kind: 'missing' as const,
                    })),
                    ...(skillAnalysis?.recommendedSkills ?? [])
                      .filter(
                        (skill) =>
                          !(skillAnalysis?.missingSkills ?? []).some(
                            (missing) => missing.toLowerCase() === skill.toLowerCase(),
                          ),
                      )
                      .map((skill) => ({
                        skill,
                        kind: 'recommended' as const,
                      })),
                  ].map(({ skill, kind }) => (
                    <KeywordChip key={`${kind}-${skill}`} component="span">
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
            {((skillAnalysis?.additionalSkills?.length ?? 0) > 0 ||
              (skillAnalysis?.transferableSkills?.length ?? 0) > 0) && (
              <Box className="skill-group" sx={{ mt: 1.5 }}>
                <Typography className="skill-group-title">Additional on resume</Typography>
                <Box className="keyword-wrap">
                  {[
                    ...(skillAnalysis?.additionalSkills ?? []),
                    ...(skillAnalysis?.transferableSkills ?? []),
                  ]
                    .filter(
                      (skill, index, all) =>
                        all.findIndex((item) => item.toLowerCase() === skill.toLowerCase()) ===
                        index,
                    )
                    .map((skill) => (
                      <KeywordChip key={`extra-${skill}`} component="span">
                        {skill}
                      </KeywordChip>
                    ))}
                </Box>
              </Box>
            )}
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
              {missingKeywords.map((keyword) => (
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
              {atsIssues.map((issue) => (
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
                weaknesses.map((issue) => (
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
              <ToneCountBadge tone="success">
                {strengths.length + activeSuggestions.length}
              </ToneCountBadge>
            </Box>
            <Box className="bullet-list">
              {strengths.map((item) => (
                <Typography key={item} className="bullet">
                  <CheckIcon fontSize="small" />
                  {item}
                </Typography>
              ))}
              {activeSuggestions.slice(0, 6).map((suggestion) => (
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
            <Typography className="tip-title">{gate.tipTitle}</Typography>
            <Typography className="tip-text">{gate.tipText}</Typography>
          </Box>
          <Button
            disabled={blockedFromOptimize ? false : !isComplete}
            isLoading={!isComplete && !blockedFromOptimize}
            size="small"
            onClick={runGateCta}
            variant={isComplete ? 'solid' : 'outline'}
          >
            {gate.ctaLabel}
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
  deletingResumeId?: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  targetRole: string;
  industry: string;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  employmentType: string;
  skills: string[];
  jobDescription: string;
  startingAnalysis: boolean;
  analysis: AnalysisResult | null;
  /** Frozen ATS result for Analyze / Define Role display (not updated by Review edits). */
  originalAnalysis?: AnalysisResult | null;
  keywords: KeywordsResponse | null;
  suggestions: SuggestionItem[];
  applyingId: number | null;
  editedContent: string;
  saving: boolean;
  recheckResult: RecheckResult | null;
  /** Live Optimize ATS — Export New ATS must match. */
  optimizedAtsScore?: number | null;
  rechecking: boolean;
  exportingFormat: 'pdf' | 'docx' | null;
  versions: ResumeVersion[];
  savingVersion: boolean;
  selectedTemplate: ResumeTemplateId;
  onDragStateChange: (dragging: boolean) => void;
  onDrop: (event: DragEvent) => void;
  onFileSelect: (file: File) => void;
  onUseResume: (resume: UploadedResume) => void;
  onDeleteResume: (resume: UploadedResume) => void | Promise<void>;
  onShowMoreResumes: () => void;
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
  onApplySuggestion: (id: number, content?: string) => void;
  onApplyAllSuggestions: (ids: number[], content: string) => void;
  onIgnoreSuggestion: (id: number) => void;
  onEditedContentChange: (value: string) => void;
  onLiveAtsChange?: (score: number, skillAnalysis?: LiveSkillAnalysis) => void;
  onSaveContent: () => void;
  onPreviewResume: () => void;
  onExport: (format: 'pdf' | 'docx', previewRoot?: HTMLElement | null) => void;
  onDone: () => void;
  onCreateNewResume?: () => void;
  onTemplateChange: (template: ResumeTemplateId) => void;
}

export function ResumeBuilderStepPanels({
  step,
  existingResumes,
  selectedResume,
  isDragging,
  uploadError,
  uploading,
  deletingResumeId = null,
  fileInputRef,
  targetRole,
  industry,
  experienceLevel,
  employmentType,
  skills,
  jobDescription,
  startingAnalysis,
  analysis,
  originalAnalysis = null,
  keywords: _keywords,
  suggestions,
  applyingId,
  editedContent,
  saving,
  recheckResult,
  optimizedAtsScore = null,
  rechecking,
  exportingFormat,
  versions,
  savingVersion,
  selectedTemplate,
  onDragStateChange,
  onDrop,
  onFileSelect,
  onUseResume,
  onDeleteResume,
  onShowMoreResumes,
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
  onApplyAllSuggestions,
  onIgnoreSuggestion,
  onEditedContentChange,
  onLiveAtsChange,
  onSaveContent,
  onPreviewResume: _onPreviewResume,
  onExport,
  onDone,
  onCreateNewResume,
  onTemplateChange,
}: ResumeBuilderStepPanelsProps) {
  const atsAnalysis = originalAnalysis ?? analysis;
  void _keywords;
  void _onPreviewResume;

  return (
    <>
      {step === 1 && (
        <UploadStep
          existingResumes={existingResumes}
          deletingResumeId={deletingResumeId}
          fileInputRef={fileInputRef}
          isDragging={isDragging}
          uploadError={uploadError}
          uploading={uploading}
          onDragStateChange={onDragStateChange}
          onDrop={onDrop}
          onFileSelect={onFileSelect}
          onUseResume={onUseResume}
          onDeleteResume={onDeleteResume}
          onShowMoreResumes={onShowMoreResumes}
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
          analysis={atsAnalysis}
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
          analysis={atsAnalysis}
          editedContent={editedContent}
          isComplete={String(atsAnalysis?.status || '').toUpperCase() === 'COMPLETED'}
          selectedResume={selectedResume}
          suggestions={suggestions}
          targetRole={targetRole}
          onContinue={() => onGoTo(5)}
          onEditTarget={() => onGoTo(2)}
          onReanalyze={onStartAnalysis}
          onReplaceResume={onReplaceResume}
        />
      )}
      {(step === 4 || step === 5) && (
        <OptimizeStep
          key={selectedResume?.id || analysis?.resumeId || analysis?.id || 'optimize'}
          analysis={
            analysis && atsAnalysis
              ? {
                  ...analysis,
                  baselineAtsScore: atsAnalysis.atsScore,
                  // Seed Review "current" score from the frozen Analyze result.
                  atsScore: atsAnalysis.atsScore,
                  skillAnalysis: atsAnalysis.skillAnalysis ?? analysis.skillAnalysis,
                  editedContent:
                    analysis.editedContent || editedContent || atsAnalysis.editedContent,
                }
              : (analysis ?? atsAnalysis)
          }
          applyingId={applyingId}
          editedContent={editedContent}
          jobDescription={jobDescription}
          preferredSkills={skills}
          recheckResult={recheckResult}
          saving={saving}
          suggestions={suggestions.length > 0 ? suggestions : (analysis?.suggestions ?? [])}
          targetRole={targetRole}
          template={selectedTemplate}
          onApplySuggestion={onApplySuggestion}
          onApplyAllSuggestions={onApplyAllSuggestions}
          onIgnoreSuggestion={onIgnoreSuggestion}
          onEditedContentChange={onEditedContentChange}
          onLiveAtsChange={onLiveAtsChange}
          onExportStep={() => onGoTo(10)}
          onSaveContent={onSaveContent}
          onTemplateChange={onTemplateChange}
        />
      )}

      {step === 10 && (
        <ExportStep
          analysis={
            atsAnalysis
              ? {
                  ...(analysis ?? atsAnalysis),
                  baselineAtsScore: atsAnalysis.atsScore,
                  atsScore: atsAnalysis.atsScore,
                  editedContent:
                    editedContent || analysis?.editedContent || atsAnalysis.editedContent,
                }
              : analysis
          }
          editedContent={editedContent}
          exportingFormat={exportingFormat}
          jobDescription={jobDescription}
          preferredSkills={skills}
          optimizedAtsScore={optimizedAtsScore}
          recheckResult={recheckResult}
          rechecking={rechecking}
          savingVersion={savingVersion}
          targetRole={targetRole}
          template={selectedTemplate}
          onDone={onDone}
          onCreateNewResume={onCreateNewResume}
          onExport={onExport}
          onTemplateChange={onTemplateChange}
        />
      )}
    </>
  );
}
