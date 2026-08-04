import { Button } from '@/components/atoms';

import {
  BookmarkBorderOutlinedIcon,
  Box,
  DescriptionOutlinedIcon,
  EditOutlinedIcon,
  NavigateNextIcon,
  Typography,
} from '@/lib/material';

import { WORKFLOW_STEPS, type ResumeBuilderStep } from '../../constants';

import { HeaderPrimaryButtonSx, HeaderSecondaryButtonSx, HeroHeader, ProgressBar } from './styles';

interface PageHeaderProps {
  canContinue: boolean;
  current: ResumeBuilderStep;
  onNext: () => void;
  onSaveDraft?: () => void;
  savingDraft?: boolean;
  targetRole?: string;
  onEditRole?: () => void;
}

export function PageHeader({
  canContinue,
  current,
  onNext,
  onSaveDraft,
  savingDraft = false,
  targetRole = '',
  onEditRole,
}: PageHeaderProps) {
  const activeIndex = Math.max(
    0,
    WORKFLOW_STEPS.findIndex((workflowStep) => workflowStep.internalSteps.includes(current)),
  );
  const progress = ((activeIndex + 1) / WORKFLOW_STEPS.length) * 100;
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
          {targetRole.trim() ? (
            <Box
              sx={{
                alignItems: 'center',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                mt: 0.5,
              }}
            >
              <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                Target role: <strong>{targetRole}</strong>
              </Typography>
              {onEditRole ? (
                <Button
                  size="small"
                  startIcon={<EditOutlinedIcon fontSize="small" />}
                  variant="outline"
                  onClick={onEditRole}
                >
                  Edit role
                </Button>
              ) : null}
            </Box>
          ) : null}
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
        <Button
          disabled={!onSaveDraft || savingDraft}
          isLoading={savingDraft}
          onClick={onSaveDraft}
          size="medium"
          startIcon={<BookmarkBorderOutlinedIcon fontSize="small" />}
          sx={HeaderSecondaryButtonSx}
          variant="outline"
        >
          Save Draft
        </Button>
        <Button
          disabled={!canContinue}
          endIcon={<NavigateNextIcon fontSize="small" />}
          onClick={onNext}
          size="medium"
          sx={HeaderPrimaryButtonSx}
        >
          {nextLabel}
        </Button>
      </Box>
    </HeroHeader>
  );
}
