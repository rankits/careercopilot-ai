import type { SetupSectionId, SetupStatusDto } from '@/features/auto-apply/types/autoApply.types';
import {
  firstIncompleteRequiredSectionId,
} from '@/features/auto-apply/utils/setupSectionNavigation';
import { Alert, Box, LinearProgress, List, ListItemButton, ListItemText, MuiButton, Stack, Typography } from '@/lib/material';

export interface SetupChecklistProps {
  status: SetupStatusDto | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelectSection: (sectionId: SetupSectionId) => void;
  onBrowseJobs: () => void;
}

export function SetupChecklist({
  status,
  isLoading,
  isError,
  onRetry,
  onSelectSection,
  onBrowseJobs,
}: SetupChecklistProps) {
  if (isLoading && !status) {
    return (
      <Box aria-busy="true" aria-label="Loading setup status" sx={{ mb: 3 }}>
        <LinearProgress sx={{ mb: 1 }} />
        <List>
          {Array.from({ length: 8 }).map((_, index) => (
            <ListItemButton disabled key={`skeleton-${index}`} sx={{ opacity: 0.5 }}>
              <ListItemText primary="Loading…" secondary=" " />
            </ListItemButton>
          ))}
        </List>
      </Box>
    );
  }

  if (isError && !status) {
    return (
      <Alert
        action={
          <MuiButton color="inherit" onClick={onRetry} size="small">
            Retry
          </MuiButton>
        }
        severity="error"
        sx={{ mb: 3 }}
      >
        Couldn&apos;t load your setup status.
      </Alert>
    );
  }

  if (!status) return null;

  const nextSectionId = firstIncompleteRequiredSectionId(status.sections);
  const allRequiredComplete = status.sections
    .filter((s) => s.required)
    .every((s) => s.complete);
  const primaryLabel = allRequiredComplete ? 'Review setup' : 'Continue setup';

  return (
    <Box sx={{ mb: 3 }}>
      <Stack
        alignItems={{ xs: 'stretch', sm: 'center' }}
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 1.5 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="p" sx={{ mb: 0.5 }} variant="subtitle1">
            Setup {status.percent}% complete
          </Typography>
          <LinearProgress
            aria-label={`Setup ${status.percent} percent complete`}
            sx={{ height: 8, borderRadius: 1 }}
            value={status.percent}
            variant="determinate"
          />
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <MuiButton
            onClick={() => {
              if (nextSectionId) onSelectSection(nextSectionId);
            }}
            variant="contained"
          >
            {primaryLabel}
          </MuiButton>
          {status.readyForAssistedApply ? (
            <MuiButton onClick={onBrowseJobs} variant="outlined">
              Browse jobs
            </MuiButton>
          ) : null}
        </Stack>
      </Stack>

      <List aria-label="Application Setup checklist" sx={{ bgcolor: 'background.paper' }}>
        {status.sections.map((section) => {
          const statusText = section.complete ? 'complete' : 'incomplete';
          const requiredText = section.required ? 'required' : 'optional';
          return (
            <ListItemButton
              aria-label={`${section.label}, ${statusText}, ${requiredText}`}
              id={`setup-section-${section.id}`}
              key={section.id}
              onClick={() => onSelectSection(section.id)}
            >
              <ListItemText
                primary={`${section.complete ? '✓' : '○'} ${section.label}`}
                secondary={section.required ? 'Required' : 'Optional'}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}
