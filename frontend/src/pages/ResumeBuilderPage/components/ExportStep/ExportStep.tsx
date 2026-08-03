import { useMemo, useRef } from 'react';

import { Button } from '@/components/atoms';

import {
  AutoAwesomeOutlinedIcon,
  Box,
  DownloadIcon,
  Typography,
} from '@/lib/material';
import type {
  AnalysisResult,
  RecheckResult,
  ResumeVersion,
} from '@/services/resumeBuilder.service';
import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

import {
  RESUME_TEMPLATES,
  alignDraftSkillsToJob,
  parseResumeContent,
  type ResumeTemplateId,
} from '../../utils';
import { TemplateOption, TemplatePicker } from '../OptimizeStep/editor.styles';
import { ResumeTemplatePreview } from '../OptimizeStep/ResumeTemplatePreview';
import {
  ActionsRow,
  CardSubtitle,
  CardTitle,
  EmptyText,
  Panel,
  VersionRow,
} from '../ResumeBuilderStepPanels/styles';

import { CongratsBanner, ExportLayout, ExportPreviewCard, ScoreGrid } from './styles';

interface ExportStepProps {
  analysis: AnalysisResult | null;
  editedContent: string;
  exporting: boolean;
  jobDescription: string;
  preferredSkills: string[];
  recheckResult: RecheckResult | null;
  rechecking: boolean;
  savingVersion: boolean;
  targetRole: string;
  template: ResumeTemplateId;
  versions: ResumeVersion[];
  onBack: () => void;
  onDone: () => void;
  onExport: (format: 'pdf' | 'docx' | 'txt') => void;
  onSaveVersion: () => void;
  onTemplateChange: (template: ResumeTemplateId) => void;
}

export function ExportStep({
  analysis,
  editedContent,
  exporting,
  jobDescription,
  preferredSkills,
  recheckResult,
  rechecking,
  savingVersion,
  targetRole,
  template,
  versions,
  onBack,
  onDone,
  onExport,
  onSaveVersion,
  onTemplateChange,
}: ExportStepProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  const draft = useMemo(() => {
    const parsed = parseResumeContent(
      editedContent || analysis?.editedContent || '',
      targetRole || analysis?.targetRole || '',
    );
    return alignDraftSkillsToJob(parsed, {
      preferredSkills,
      jobDescription,
      matchedSkills: analysis?.skillAnalysis?.matchedSkills,
      recommendedSkills: analysis?.skillAnalysis?.recommendedSkills,
      optimizedSummary: analysis?.optimizedSummary,
    });
  }, [
    analysis?.editedContent,
    analysis?.optimizedSummary,
    analysis?.skillAnalysis?.matchedSkills,
    analysis?.skillAnalysis?.recommendedSkills,
    analysis?.targetRole,
    editedContent,
    jobDescription,
    preferredSkills,
    targetRole,
  ]);

  const previousScore =
    recheckResult?.previousAtsScore ??
    analysis?.baselineAtsScore ??
    analysis?.atsScore ??
    0;
  const finalScore = recheckResult?.atsScore ?? previousScore;
  const improvement = recheckResult?.improvement ?? finalScore - previousScore;
  const scoreColor = (score: number) =>
    score >= 80
      ? colorTokens.feedbackSuccess
      : score >= 60
        ? colorTokens.feedbackWarning
        : colorTokens.feedbackError;

  const congratsTitle = rechecking
    ? 'Calculating your ATS score…'
    : improvement > 0
      ? `Nice — your ATS score improved by +${improvement}`
      : improvement < 0
        ? `ATS score updated (${improvement}) — add more JD keywords to improve`
        : 'Your optimized resume is ready';

  const congratsText = rechecking
    ? 'Hang tight while we re-score your optimized resume against the job description.'
    : `Previous ${previousScore}/100 → now ${finalScore}/100 (${
        recheckResult?.grade ?? 'Updated'
      }). Score reflects keyword/skill coverage in your current resume text — not a fixed 99.`;

  return (
    <ExportLayout>
      <Panel>
        <CongratsBanner>
          <Box className="icon">
            <AutoAwesomeOutlinedIcon />
          </Box>
          <Box>
            <Typography className="title">{congratsTitle}</Typography>
            <Typography className="text">{congratsText}</Typography>
          </Box>
        </CongratsBanner>

        <ScoreGrid>
          <Box className="score-card">
            <Typography className="label">Previous ATS</Typography>
            <Typography className="value">{previousScore}</Typography>
          </Box>
          <Box className="score-card highlight">
            <Typography className="label">New ATS</Typography>
            <Typography className="value" style={{ color: scoreColor(finalScore) }}>
              {rechecking ? '…' : finalScore}
            </Typography>
          </Box>
          <Box className="score-card">
            <Typography className="label">Improvement</Typography>
            <Typography className="value positive">
              {rechecking
                ? '…'
                : improvement > 0
                  ? `+${improvement}`
                  : `${improvement}`}
            </Typography>
          </Box>
          <Box className="score-card">
            <Typography className="label">Keyword match</Typography>
            <Typography className="value">
              {recheckResult?.keywordMatch ?? analysis?.keywordMatch ?? '—'}
            </Typography>
          </Box>
          <Box className="score-card">
            <Typography className="label">Skill match</Typography>
            <Typography className="value">
              {recheckResult?.skillMatch ?? analysis?.skillMatch ?? '—'}
            </Typography>
          </Box>
          <Box className="score-card">
            <Typography className="label">Content quality</Typography>
            <Typography className="value">
              {recheckResult?.contentQuality ?? analysis?.contentQuality ?? '—'}
            </Typography>
          </Box>
        </ScoreGrid>

        <CardTitle>Export Your Optimized Resume</CardTitle>
        <CardSubtitle>
          Preview uses your selected theme. Download PDF to keep that same Classic / Modern /
          Minimal / Executive look.
        </CardSubtitle>

        <TemplatePicker>
          {RESUME_TEMPLATES.map((item) => (
            <TemplateOption
              key={item.id}
              type="button"
              active={template === item.id}
              onClick={() => onTemplateChange(item.id)}
            >
              <span className="label">{item.label}</span>
              <span className="desc">{item.description}</span>
            </TemplateOption>
          ))}
        </TemplatePicker>

        <Box sx={{ display: 'flex', gap: spacing[4], flexWrap: 'wrap', mb: spacing[5] }}>
          {(['pdf', 'docx', 'txt'] as const).map((fmt) => (
            <Button
              key={fmt}
              disabled={exporting}
              startIcon={<DownloadIcon fontSize="small" />}
              variant={fmt === 'pdf' ? 'solid' : 'outline'}
              onClick={() => void onExport(fmt)}
            >
              {exporting ? '…' : `Download ${fmt.toUpperCase()}`}
            </Button>
          ))}
        </Box>

        <Box sx={{ borderTop: `1px solid ${colorTokens.borderDefault}`, paddingTop: spacing[5] }}>
          <Box
            sx={{
              alignItems: 'center',
              display: 'flex',
              justifyContent: 'space-between',
              mb: spacing[3],
            }}
          >
            <Typography fontWeight={fontWeight.semiBold}>Version History</Typography>
            <Button
              disabled={savingVersion}
              size="small"
              variant="outline"
              onClick={() => void onSaveVersion()}
            >
              {savingVersion ? 'Saving…' : '+ Save current version'}
            </Button>
          </Box>

          {versions.length === 0 ? (
            <EmptyText>No versions saved yet.</EmptyText>
          ) : (
            <Box sx={{ display: 'grid', gap: spacing[2] }}>
              {versions.map((v) => (
                <VersionRow key={v.id}>
                  <Box>
                    <Typography fontWeight={fontWeight.medium} fontSize={fontSize.sm}>
                      {v.label}
                    </Typography>
                    <Typography fontSize={fontSize.xs} color={colorTokens.textSecondary}>
                      {new Date(v.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography
                    fontSize={fontSize.sm}
                    color={scoreColor(v.atsScore)}
                    fontWeight={fontWeight.semiBold}
                  >
                    ATS {v.atsScore}
                  </Typography>
                </VersionRow>
              ))}
            </Box>
          )}
        </Box>

        <ActionsRow sx={{ justifyContent: 'space-between' }}>
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button disabled={savingVersion} onClick={() => void onDone()}>
            {savingVersion ? 'Saving…' : 'Done — Save resume'}
          </Button>
        </ActionsRow>
      </Panel>

      <ExportPreviewCard>
        <Typography className="preview-title">
          {RESUME_TEMPLATES.find((item) => item.id === template)?.label ?? 'Classic'} preview
        </Typography>
        <ResumeTemplatePreview
          ref={previewRef}
          draft={draft}
          template={template}
          targetRole={targetRole || analysis?.targetRole || ''}
        />
      </ExportPreviewCard>
    </ExportLayout>
  );
}
