import type {
  WorkspaceStepId,
  WorkspaceStepStatusDto,
} from '@/features/auto-apply/types/autoApply.types';
import { isWorkspaceStepEnabled } from '@/features/auto-apply/utils/assistedApplyWorkspace';
import { Box, CheckIcon, LinearProgress, Stack, Typography } from '@/lib/material';

export interface WorkspaceStepProgressProps {
  steps: WorkspaceStepStatusDto[];
  activeStep: WorkspaceStepId;
  onSelect: (stepId: WorkspaceStepId) => void;
}

function statusCaption(step: WorkspaceStepStatusDto, isCurrent: boolean): string {
  if (step.status === 'WARNING') return 'Needs review';
  if (step.status === 'UNKNOWN') return 'Unknown';
  if (step.status === 'COMPLETE' || step.complete) return 'Complete';
  if (isCurrent || step.status === 'CURRENT') return 'In progress';
  return 'Upcoming';
}

/**
 * Desktop: circle-and-connector stepper with status labels.
 * Mobile: "N of M: Label" + compact linear progress (tabs stay for keyboard nav elsewhere if needed).
 */
export function WorkspaceStepProgress({ steps, activeStep, onSelect }: WorkspaceStepProgressProps) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === activeStep),
  );
  const progressPct = steps.length <= 1 ? 100 : ((activeIndex + 1) / steps.length) * 100;
  const activeLabel = steps[activeIndex]?.label ?? 'Step';

  return (
    <Box sx={{ mb: 3 }} role="navigation" aria-label="Assisted Apply steps">
      {/* Mobile compact */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, position: 'relative', zIndex: 0 }}>
        <Typography fontWeight={600} sx={{ overflowWrap: 'anywhere' }} variant="body2">
          {activeIndex + 1} of {steps.length}: {activeLabel}
        </Typography>
        <LinearProgress
          aria-label={`Step ${activeIndex + 1} of ${steps.length}`}
          sx={{ mt: 1, height: 6, borderRadius: 1 }}
          value={progressPct}
          variant="determinate"
        />
        <Stack
          component="ol"
          direction="row"
          spacing={0.75}
          sx={{ listStyle: 'none', m: 0, mt: 1.25, p: 0, overflowX: 'auto' }}
        >
          {steps.map((step, index) => {
            const enabled = isWorkspaceStepEnabled(steps, step.id);
            const isCurrent = step.id === activeStep;
            const done = step.status === 'COMPLETE' || step.complete;
            return (
              <Box
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${step.label} — ${statusCaption(step, isCurrent)}`}
                component="li"
                key={step.id}
                onClick={() => {
                  if (enabled) onSelect(step.id);
                }}
                onKeyDown={(event) => {
                  if (!enabled) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(step.id);
                  }
                }}
                role="button"
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: enabled ? 'pointer' : 'default',
                  bgcolor: done ? 'success.main' : isCurrent ? 'primary.main' : 'action.hover',
                  color: done || isCurrent ? 'common.white' : 'text.secondary',
                  fontSize: 12,
                  fontWeight: 700,
                  opacity: enabled ? 1 : 0.5,
                }}
                tabIndex={enabled ? 0 : -1}
              >
                {done ? <CheckIcon sx={{ fontSize: 16 }} /> : index + 1}
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* Desktop stepper */}
      <Stack
        alignItems="flex-start"
        direction="row"
        sx={{ display: { xs: 'none', md: 'flex' }, width: '100%' }}
      >
        {steps.map((step, index) => {
          const enabled = isWorkspaceStepEnabled(steps, step.id);
          const isCurrent = step.id === activeStep;
          const done = step.status === 'COMPLETE' || step.complete;
          const caption = statusCaption(step, isCurrent);
          const isLast = index === steps.length - 1;

          return (
            <Stack
              alignItems="center"
              direction="row"
              key={step.id}
              sx={{ flex: isLast ? '0 0 auto' : 1, minWidth: 0 }}
            >
              <Stack
                alignItems="center"
                component="button"
                disabled={!enabled}
                onClick={() => onSelect(step.id)}
                spacing={0.75}
                sx={{
                  position: 'relative',
                  border: 0,
                  background: 'none',
                  cursor: enabled ? 'pointer' : 'default',
                  p: 0.5,
                  minWidth: 88,
                  opacity: enabled ? 1 : 0.55,
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                    borderRadius: 1,
                  },
                }}
                type="button"
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: done ? 'success.main' : isCurrent ? 'primary.main' : 'grey.200',
                    color: done || isCurrent ? 'common.white' : 'text.secondary',
                    border: isCurrent && !done ? 2 : 0,
                    borderColor: 'primary.light',
                  }}
                >
                  {done ? <CheckIcon sx={{ fontSize: 18 }} /> : index + 1}
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    fontWeight={isCurrent ? 700 : 500}
                    sx={{ lineHeight: 1.2 }}
                    variant="body2"
                  >
                    {step.label}
                  </Typography>
                  <Typography
                    color={isCurrent ? 'primary.main' : 'text.secondary'}
                    variant="caption"
                  >
                    {caption}
                  </Typography>
                </Box>
              </Stack>
              {!isLast ? (
                <Box
                  aria-hidden
                  sx={{
                    flex: 1,
                    height: 2,
                    mx: 1,
                    mt: -3.5,
                    bgcolor: done ? 'success.light' : 'divider',
                    minWidth: 12,
                  }}
                />
              ) : null}
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}
