import type { SetupSectionId, SetupStatusDto } from '@/features/auto-apply/types/autoApply.types';
import { firstIncompleteRequiredSectionId } from '@/features/auto-apply/utils/setupSectionNavigation';
import {
  Alert,
  Box,
  CheckCircleIcon,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  MuiButton,
  Stack,
  TextField,
  Typography,
} from '@/lib/material';

import { setupPageSx } from './setupPageStyles';

export interface SetupChecklistProps {
  activeSection: SetupSectionId;
  status: SetupStatusDto | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelectSection: (sectionId: SetupSectionId) => void;
  onBrowseJobs: () => void;
}

export function SetupChecklist({
  activeSection,
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

  if (!status) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        Loading your setup checklist…
      </Alert>
    );
  }

  const nextSectionId = firstIncompleteRequiredSectionId(status.sections);
  const allRequiredComplete = status.sections.filter((s) => s.required).every((s) => s.complete);
  const primaryLabel = allRequiredComplete ? 'Review setup' : 'Continue setup';

  return (
    <Box
      sx={{
        '& .MuiListItemButton-root': { minHeight: 54 },
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.035)',
        mb: { xs: 2, lg: 0 },
        overflow: 'hidden',
      }}
    >
      <Stack spacing={1} sx={{ borderBottom: 1, borderColor: 'divider', p: 2 }}>
        <Box>
          <Typography component="p" sx={{ ...setupPageSx.sidebarTitle, mb: 0.75 }}>
            Your setup
          </Typography>
          <LinearProgress
            aria-label={`Setup ${status.percent} percent complete`}
            sx={{ borderRadius: 99, height: 6 }}
            value={status.percent}
            variant="determinate"
          />
        </Box>
        <Stack direction="row" spacing={1}>
          <MuiButton
            onClick={() => {
              if (nextSectionId) onSelectSection(nextSectionId);
            }}
            size="small"
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

      <TextField
        aria-label="Choose setup section"
        onChange={(event) => onSelectSection(event.target.value as SetupSectionId)}
        select
        size="small"
        sx={{ display: { xs: 'flex', lg: 'none' }, m: 1.5 }}
        value={activeSection}
      >
        {status.sections.map((section, index) => (
          <MenuItem key={section.id} value={section.id}>
            {index + 1}. {section.label} · {section.required ? 'Required' : 'Optional'}
          </MenuItem>
        ))}
      </TextField>
      <List
        aria-label="Application Setup checklist"
        disablePadding
        sx={{ display: { xs: 'none', lg: 'block' } }}
      >
        {status.sections.map((section) => {
          const statusText = section.complete ? 'complete' : 'incomplete';
          const requiredText = section.required ? 'required' : 'optional';
          const sectionNumber = status.sections.indexOf(section) + 1;
          return (
            <ListItemButton
              aria-label={`${section.label}, ${statusText}, ${requiredText}`}
              id={`setup-section-${section.id}`}
              key={section.id}
              onClick={() => onSelectSection(section.id)}
              selected={activeSection === section.id}
              sx={{
                alignItems: 'center',
                borderLeft: 3,
                borderLeftColor: activeSection === section.id ? 'primary.main' : 'transparent',
                gap: 1.25,
                px: 1.5,
              }}
            >
              <Box
                sx={{
                  alignItems: 'center',
                  bgcolor: section.complete ? 'success.light' : 'grey.100',
                  borderRadius: '50%',
                  color: section.complete ? 'success.dark' : 'text.secondary',
                  display: 'flex',
                  flex: '0 0 auto',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  height: 20,
                  justifyContent: 'center',
                  width: 20,
                }}
              >
                {section.complete ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : sectionNumber}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={setupPageSx.sidebarItemTitle}>
                  {section.label}
                </Typography>
                <Typography color="text.secondary" sx={setupPageSx.sidebarItemCaption}>
                  {section.required ? 'Required' : 'Optional'}
                </Typography>
              </Box>
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}
