import { useMemo, useRef } from 'react';

import { Button } from '@/components/atoms';

import {
  ArticleOutlinedIcon,
  AutoAwesomeOutlinedIcon,
  Box,
  PictureAsPdfOutlinedIcon,
  Typography,
} from '@/lib/material';
import type { AnalysisResult, RecheckResult } from '@/services/resumeBuilder.service';
import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

import {
  RESUME_TEMPLATES,
  alignDraftToJob,
  parseResumeContent,
  type ResumeTemplateId,
} from '../../utils';
import { TemplateOption, TemplatePicker } from '../OptimizeStep/editor.styles';
import { ResumeTemplatePreview } from '../OptimizeStep/ResumeTemplatePreview';
import { ActionsRow, CardSubtitle, CardTitle, Panel } from '../ResumeBuilderStepPanels/styles';

import { CongratsBanner, ExportLayout, ExportPreviewCard, ScoreGrid } from './styles';

interface ExportStepProps {
  analysis: AnalysisResult | null;
  editedContent: string;
  exportingFormat: 'pdf' | 'docx' | null;
  jobDescription: string;
  preferredSkills: string[];
  recheckResult: RecheckResult | null;
  rechecking: boolean;
  savingVersion: boolean;
  targetRole: string;
  template: ResumeTemplateId;
  onBack: () => void;
  onDone: () => void;
  onExport: (format: 'pdf' | 'docx', previewRoot?: HTMLElement | null) => void;
  onTemplateChange: (template: ResumeTemplateId) => void;
}

export function ExportStep({
  analysis,
  editedContent,
  exportingFormat,
  jobDescription,
  preferredSkills,
  recheckResult,
  rechecking,
  savingVersion,
  targetRole,
  template,
  onBack,
  onDone,
  onExport,
  onTemplateChange,
}: ExportStepProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const pdfLoading = exportingFormat === 'pdf';
  const docxLoading = exportingFormat === 'docx';
  const anyExporting = exportingFormat !== null;

  const draft = useMemo(() => {
    const parsed = parseResumeContent(
      editedContent || analysis?.editedContent || '',
      targetRole || analysis?.targetRole || '',
    );
    return alignDraftToJob(parsed, {
      preferredSkills,
      jobDescription,
      matchedSkills: analysis?.skillAnalysis?.matchedSkills,
      recommendedSkills: [
        ...(analysis?.skillAnalysis?.recommendedSkills ?? []),
        ...(analysis?.skillAnalysis?.missingSkills ?? []),
      ],
      optimizedSummary: analysis?.optimizedSummary,
    });
  }, [
    analysis?.editedContent,
    analysis?.optimizedSummary,
    analysis?.skillAnalysis?.matchedSkills,
    analysis?.skillAnalysis?.missingSkills,
    analysis?.skillAnalysis?.recommendedSkills,
    analysis?.targetRole,
    editedContent,
    jobDescription,
    preferredSkills,
    targetRole,
  ]);

  const previousScore =
    recheckResult?.previousAtsScore ?? analysis?.baselineAtsScore ?? analysis?.atsScore ?? 0;
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
              {rechecking ? '…' : improvement > 0 ? `+${improvement}` : `${improvement}`}
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
          Preview uses your selected theme. Download PDF or Word to keep that same look.
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
          <Button
            disabled={pdfLoading || rechecking}
            isLoading={pdfLoading}
            startIcon={<PictureAsPdfOutlinedIcon fontSize="small" />}
            variant="solid"
            onClick={() => void onExport('pdf', previewRef.current)}
          >
            {pdfLoading ? 'Generating…' : 'Download PDF'}
          </Button>
          <Button
            disabled={docxLoading || rechecking}
            isLoading={docxLoading}
            startIcon={<ArticleOutlinedIcon fontSize="small" />}
            variant="outline"
            onClick={() => void onExport('docx', previewRef.current)}
          >
            {docxLoading ? 'Generating…' : 'Download Word Document'}
          </Button>
        </Box>

        <ActionsRow sx={{ justifyContent: 'space-between' }}>
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button
            disabled={savingVersion || anyExporting || rechecking}
            isLoading={savingVersion}
            onClick={() => void onDone()}
          >
            {savingVersion ? 'Saving…' : 'Save Resume'}
          </Button>
        </ActionsRow>
      </Panel>

      <ExportPreviewCard>
        <Typography
          sx={{
            color: colorTokens.textSecondary,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semiBold,
            letterSpacing: '0.04em',
            mb: spacing[3],
            textTransform: 'uppercase',
          }}
        >
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
