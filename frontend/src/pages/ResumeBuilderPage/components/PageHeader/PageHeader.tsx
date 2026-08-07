import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Button } from '@/components/atoms';

import { WORKFLOW_STEPS, type ResumeBuilderStep } from '../../constants';

import { HeaderPrimaryButtonSx, HeaderSecondaryButtonSx, HeroHeader, ProgressBar } from './styles';

interface PageHeaderProps {
  canContinue: boolean;
  current: ResumeBuilderStep;
  onBack?: () => void;
  onNext: () => void;
}

export function PageHeader({ canContinue, current, onBack, onNext }: PageHeaderProps) {
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
