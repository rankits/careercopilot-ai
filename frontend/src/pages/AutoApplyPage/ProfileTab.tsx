import { useEffect, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import {
  useCandidateProfile,
  useUpsertCandidateProfile,
} from '@/features/auto-apply/hooks/useCandidateProfile';

import type { RemotePreference } from '@/features/auto-apply/types/autoApply.types';
import {
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@/lib/material';

const REMOTE_OPTIONS: { label: string; value: RemotePreference }[] = [
  { label: 'Any', value: 'ANY' },
  { label: 'Remote', value: 'REMOTE' },
  { label: 'Hybrid', value: 'HYBRID' },
  { label: 'Onsite', value: 'ONSITE' },
];

export function ProfileTab() {
  const { data: profile, isLoading } = useCandidateProfile();
  const upsertProfile = useUpsertCandidateProfile();
  const { showToast } = useToast();

  const [desiredRoles, setDesiredRoles] = useState('');
  const [preferredLocations, setPreferredLocations] = useState('');
  const [remotePreference, setRemotePreference] = useState<RemotePreference>('ANY');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState('');
  const [noticePeriodDays, setNoticePeriodDays] = useState('');
  const [willingToRelocate, setWillingToRelocate] = useState(false);
  const [requiresSponsorship, setRequiresSponsorship] = useState(false);
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');

  useEffect(() => {
    if (!profile) return;
    setDesiredRoles(profile.preferences.desiredRoles.join(', '));
    setPreferredLocations(profile.preferences.preferredLocations.join(', '));
    setRemotePreference(profile.preferences.remotePreference);
    setSalaryMin(profile.preferences.expectedSalary?.min?.toString() ?? '');
    setSalaryMax(profile.preferences.expectedSalary?.max?.toString() ?? '');
    setSalaryCurrency(profile.preferences.expectedSalary?.currency ?? '');
    setNoticePeriodDays(profile.preferences.noticePeriodDays?.toString() ?? '');
    setWillingToRelocate(profile.preferences.willingToRelocate ?? false);
    setRequiresSponsorship(profile.preferences.requiresSponsorship ?? false);
    setLinkedin(profile.links.linkedin ?? '');
    setGithub(profile.links.github ?? '');
    setPortfolio(profile.links.portfolio ?? '');
  }, [profile]);

  const handleSave = async () => {
    try {
      await upsertProfile.mutateAsync({
        preferences: {
          desiredRoles: desiredRoles
            .split(',')
            .map((role) => role.trim())
            .filter(Boolean),
          preferredLocations: preferredLocations
            .split(',')
            .map((location) => location.trim())
            .filter(Boolean),
          remotePreference,
          expectedSalary:
            salaryMin || salaryMax || salaryCurrency
              ? {
                  min: salaryMin ? Number(salaryMin) : undefined,
                  max: salaryMax ? Number(salaryMax) : undefined,
                  currency: salaryCurrency || undefined,
                }
              : undefined,
          noticePeriodDays: noticePeriodDays ? Number(noticePeriodDays) : undefined,
          willingToRelocate,
          requiresSponsorship,
        },
        links: {
          linkedin: linkedin || undefined,
          github: github || undefined,
          portfolio: portfolio || undefined,
        },
      });
      showToast({ message: 'Application profile saved.', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to save profile.',
        severity: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Paper
      sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 640 }}
      variant="outlined"
    >
      <Typography variant="h6">Candidate application profile</Typography>
      <Typography color="text.secondary" variant="body2">
        Used by the eligibility engine and the application planner — kept separate from your resume
        parsing profile.
      </Typography>

      <TextField
        fullWidth
        helperText="Comma-separated"
        label="Desired roles"
        onChange={(event) => setDesiredRoles(event.target.value)}
        value={desiredRoles}
      />
      <TextField
        fullWidth
        helperText="Comma-separated"
        label="Preferred locations"
        onChange={(event) => setPreferredLocations(event.target.value)}
        value={preferredLocations}
      />
      <TextField
        fullWidth
        label="Remote preference"
        onChange={(event) => setRemotePreference(event.target.value as RemotePreference)}
        select
        value={remotePreference}
      >
        {REMOTE_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="Expected salary min"
          onChange={(event) => setSalaryMin(event.target.value)}
          type="number"
          value={salaryMin}
        />
        <TextField
          label="Expected salary max"
          onChange={(event) => setSalaryMax(event.target.value)}
          type="number"
          value={salaryMax}
        />
        <TextField
          label="Currency"
          onChange={(event) => setSalaryCurrency(event.target.value.toUpperCase())}
          slotProps={{ htmlInput: { maxLength: 3 } }}
          value={salaryCurrency}
        />
      </Box>

      <TextField
        label="Notice period (days)"
        onChange={(event) => setNoticePeriodDays(event.target.value)}
        type="number"
        value={noticePeriodDays}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={willingToRelocate}
            onChange={(event) => setWillingToRelocate(event.target.checked)}
          />
        }
        label="Willing to relocate"
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={requiresSponsorship}
            onChange={(event) => setRequiresSponsorship(event.target.checked)}
          />
        }
        label="Requires visa sponsorship"
      />

      <TextField
        fullWidth
        label="LinkedIn"
        onChange={(event) => setLinkedin(event.target.value)}
        value={linkedin}
      />
      <TextField
        fullWidth
        label="GitHub"
        onChange={(event) => setGithub(event.target.value)}
        value={github}
      />
      <TextField
        fullWidth
        label="Portfolio"
        onChange={(event) => setPortfolio(event.target.value)}
        value={portfolio}
      />

      <Box>
        <Button isLoading={upsertProfile.isPending} onClick={() => void handleSave()}>
          Save profile
        </Button>
      </Box>
    </Paper>
  );
}
