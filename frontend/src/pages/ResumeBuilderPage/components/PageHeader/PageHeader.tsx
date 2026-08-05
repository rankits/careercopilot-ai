import { Button } from '@/components/atoms';

import {
  BookmarkBorderOutlinedIcon,
  Box,
  DescriptionOutlinedIcon,
  NavigateBeforeIcon,
  NavigateNextIcon,
  Typography,
} from '@/lib/material';

import { WORKFLOW_STEPS, type ResumeBuilderStep } from '../../constants';

import { HeaderPrimaryButtonSx, HeaderSecondaryButtonSx, HeroHeader, ProgressBar } from './styles';

interface PageHeaderProps {
  canContinue: boolean;
  current: ResumeBuilderStep;
  onBack?: () => void;
  onNext: () => void;
  onSaveDraft?: () => void;
  savingDraft?: boolean;
}

export function PageHeader({
  canContinue,
  current,
  onBack,
  onNext,
  onSaveDraft,
  savingDraft = false,
}: PageHeaderProps) {
  const activeIndex = Math.max(
    0,
    WORKFLOW_STEPS.findIndex((workflowStep) => workflowStep.internalSteps.includes(current)),
  );
  const progress = ((activeIndex + 1) / WORKFLOW_STEPS.length) * 100;
  const isExportStep = current === 10;
  const nextLabel = activeIndex === 3 ? 'Next: Export' : 'Next';

  return (
    <HeroHeader>
      <Box className="title-cluster">
        <Box className="title-icon">
          <DescriptionOutlinedIcon />
        </Box>
        <Box className="title-copy">
          <Typography className="page-title" component="h1">
            Resume Builder
          </Typography>
          <Typography className="page-subtitle">
            Upload, optimize, and export your resume with AI assistance.
          </Typography>
        </Box>
      </Box>

      <Box className="progress-summary">
        <Box className="progress-meta">
          <span>Step {activeIndex + 1} of 5</span>
          <Box className="progress-value" component="span">
            {Math.round(progress)}%
          </Box>
        </Box>
        <ProgressBar variant="determinate" value={progress} />
      </Box>

      <Box className="header-actions">
        {onBack ? (
          <Button
            onClick={onBack}
            size="medium"
            startIcon={<NavigateBeforeIcon fontSize="small" />}
            sx={HeaderSecondaryButtonSx}
            variant="outline"
          >
            Back
          </Button>
        ) : null}
        {!isExportStep && onSaveDraft ? (
          <Button
            disabled={savingDraft}
            isLoading={savingDraft}
            onClick={onSaveDraft}
            size="medium"
            startIcon={<BookmarkBorderOutlinedIcon fontSize="small" />}
            sx={HeaderSecondaryButtonSx}
            variant="outline"
          >
            Save Draft
          </Button>
        ) : null}
        {!isExportStep ? (
          <Button
            disabled={!canContinue}
            endIcon={<NavigateNextIcon fontSize="small" />}
            onClick={onNext}
            size="medium"
            sx={HeaderPrimaryButtonSx}
          >
            {nextLabel}
          </Button>
        ) : null}
      </Box>
    </HeroHeader>
  );
}
