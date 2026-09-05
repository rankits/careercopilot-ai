import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Box from '@mui/material/Box';

import { WORKFLOW_STEPS, type ResumeBuilderStep } from '../../constants';

import { StepDot, StepItem, Stepper } from './styles';

export function WorkflowStepper({ current }: { current: ResumeBuilderStep }) {
  const activeWorkflowIndex = WORKFLOW_STEPS.findIndex((step) =>
    step.internalSteps.includes(current),
  );

  return (
    <Stepper>
      {WORKFLOW_STEPS.map((workflowStep, idx) => {
        const active = idx === activeWorkflowIndex;
        const completed = idx < activeWorkflowIndex;
        const Icon = workflowStep.icon;

        return (
          <Box key={workflowStep.label} className="step-wrap">
            <StepItem active={active} completed={completed}>
              <StepDot active={active} completed={completed}>
                {completed ? <CheckCircleIcon sx={{ fontSize: '1rem' }} /> : <Icon />}
              </StepDot>
              <Box className="step-copy">
                <Box className="step-label">{workflowStep.label}</Box>
                <Box className="step-description">{workflowStep.description}</Box>
              </Box>
            </StepItem>
            {idx < WORKFLOW_STEPS.length - 1 && <Box className="step-connector" />}
          </Box>
        );
      })}
    </Stepper>
  );
}
