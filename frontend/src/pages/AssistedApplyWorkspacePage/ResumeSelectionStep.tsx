import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useConsents } from '@/features/auto-apply/hooks/useConsents';
import { useUpdateResumeSelection } from '@/features/auto-apply/hooks/useResumeHandoff';
import { useResumeVersions } from '@/features/auto-apply/hooks/useResumeVersions';

import { ROUTES } from '@/constants/routes';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  MuiButton,
  Radio,
  RadioGroup,
  Stack,
  FormControlLabel,
  Typography,
} from '@/lib/material';

export interface ResumeSelectionStepProps {
  jobApplicationId: string;
  selectedResumeVersionId: string | null;
}

export function ResumeSelectionStep({
  jobApplicationId,
  selectedResumeVersionId,
}: ResumeSelectionStepProps) {
  const consentsQuery = useConsents();
  const versionsQuery = useResumeVersions();
  const selectionMutation = useUpdateResumeSelection(jobApplicationId);
  const [localSelected, setLocalSelected] = useState<string | null>(selectedResumeVersionId);
  const [savedFlash, setSavedFlash] = useState(false);

  const hasResumeConsent =
    consentsQuery.data?.some((c) => c.consentType === 'RESUME_USAGE' && !c.revokedAt) ?? false;

  useEffect(() => {
    setLocalSelected(selectedResumeVersionId);
  }, [selectedResumeVersionId]);

  // AA-060: auto-persist default on first visit when nothing selected
  useEffect(() => {
    if (!hasResumeConsent) return;
    if (selectedResumeVersionId) return;
    if (!versionsQuery.data?.length) return;
    if (selectionMutation.isPending || selectionMutation.isSuccess) return;
    const defaultVersion = versionsQuery.data.find((v) => v.isActive) ?? versionsQuery.data[0];
    if (!defaultVersion) return;
    selectionMutation.mutate(defaultVersion.id, {
      onSuccess: () => setLocalSelected(defaultVersion.id),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResumeConsent, selectedResumeVersionId, versionsQuery.data]);

  if (consentsQuery.isLoading || versionsQuery.isLoading) {
    return (
      <Stack alignItems="center" direction="row" spacing={1.5} sx={{ py: 2 }}>
        <CircularProgress size={20} />
        <Typography>Loading resumes…</Typography>
      </Stack>
    );
  }

  if (!hasResumeConsent) {
    return (
      <Alert
        action={
          <MuiButton
            component={RouterLink}
            size="small"
            to={`${ROUTES.AUTO_APPLY}?section=consents`}
            variant="outlined"
          >
            Grant in Setup
          </MuiButton>
        }
        severity="warning"
      >
        Grant resume usage to select a resume for this application.
      </Alert>
    );
  }

  if (!versionsQuery.data?.length) {
    return (
      <Alert
        action={
          <MuiButton
            component={RouterLink}
            size="small"
            to={`${ROUTES.AUTO_APPLY}?section=resumes`}
            variant="outlined"
          >
            Set up resumes
          </MuiButton>
        }
        severity="info"
      >
        You haven&apos;t approved any resumes yet.
      </Alert>
    );
  }

  const handleChange = (resumeVersionId: string) => {
    setLocalSelected(resumeVersionId);
    selectionMutation.mutate(resumeVersionId, {
      onSuccess: () => {
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 1500);
      },
    });
  };

  return (
    <Stack spacing={1.5}>
      <Typography fontWeight={600} variant="subtitle2">
        Resume for this application
      </Typography>
      {savedFlash ? (
        <Typography color="success.main" variant="caption">
          Saved
        </Typography>
      ) : null}
      <RadioGroup onChange={(_e, value) => handleChange(value)} value={localSelected ?? ''}>
        {versionsQuery.data.map((version) => (
          <Box
            key={version.id}
            sx={{
              border: 1,
              borderColor: localSelected === version.id ? 'primary.main' : 'divider',
              borderRadius: 1,
              px: 1.5,
              py: 0.5,
              mb: 1,
            }}
          >
            <FormControlLabel
              control={<Radio />}
              label={
                <Stack alignItems="center" direction="row" spacing={1}>
                  <Typography variant="body2">{version.label}</Typography>
                  {version.isActive ? <Chip label="Default" size="small" /> : null}
                </Stack>
              }
              value={version.id}
            />
          </Box>
        ))}
      </RadioGroup>
      {selectionMutation.isError ? (
        <Alert severity="error">{selectionMutation.error.message}</Alert>
      ) : null}
    </Stack>
  );
}
