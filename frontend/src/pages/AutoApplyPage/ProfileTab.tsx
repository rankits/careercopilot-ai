import { useEffect, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import {
  useCandidateProfile,
  useUpsertCandidateProfile,
} from '@/features/auto-apply/hooks/useCandidateProfile';

import type { WorkModePreference } from '@/features/auto-apply/types/autoApply.types';
import {
  resolveRemotePreferences,
  SALARY_CURRENCIES,
  WORK_MODE_OPTIONS,
} from '@/features/auto-apply/utils/setupCompleteness';
import {
  Autocomplete,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@/lib/material';

const ROLE_SUGGESTIONS = [
  'Software Engineer',
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Engineer',
  'Product Designer',
  'Mobile Product Designer',
  'Product Manager',
  'Data Engineer',
  'DevOps Engineer',
];

const LOCATION_SUGGESTIONS = [
  'Remote',
  'United States',
  'Canada',
  'United Kingdom',
  'India',
  'Germany',
  'Singapore',
  'Australia',
  'North America',
  'Europe',
];

export function ProfileTab() {
  const { data: profile, isLoading } = useCandidateProfile();
  const upsertProfile = useUpsertCandidateProfile();
  const { showToast } = useToast();

  const [desiredRoles, setDesiredRoles] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [remotePreferences, setRemotePreferences] = useState<WorkModePreference[]>([]);
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState('');
  const [salaryFlexible, setSalaryFlexible] = useState(false);
  const [immediateJoiner, setImmediateJoiner] = useState(false);
  const [noticePeriodDays, setNoticePeriodDays] = useState('');
  const [willingToRelocate, setWillingToRelocate] = useState(false);
  const [requiresSponsorship, setRequiresSponsorship] = useState(false);
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');

  useEffect(() => {
    if (!profile) return;
    setDesiredRoles(profile.preferences.desiredRoles ?? []);
    setPreferredLocations(profile.preferences.preferredLocations ?? []);
    setRemotePreferences(resolveRemotePreferences(profile.preferences));
    const min = profile.preferences.expectedSalary?.min;
    const max = profile.preferences.expectedSalary?.max;
    setSalaryMin(min != null ? String(min) : '');
    setSalaryMax(max != null ? String(max) : '');
    setSalaryCurrency(profile.preferences.expectedSalary?.currency ?? '');
    setSalaryFlexible(
      min == null && max == null && Boolean(profile.preferences.expectedSalary?.currency),
    );
    const notice = profile.preferences.noticePeriodDays;
    setImmediateJoiner(notice === 0);
    setNoticePeriodDays(notice != null && notice > 0 ? String(notice) : '');
    setWillingToRelocate(profile.preferences.willingToRelocate ?? false);
    setRequiresSponsorship(profile.preferences.requiresSponsorship ?? false);
    setLinkedin(profile.links.linkedin ?? '');
    setGithub(profile.links.github ?? '');
    setPortfolio(profile.links.portfolio ?? '');
  }, [profile]);

  const handleSave = async () => {
    if (desiredRoles.length === 0) {
      showToast({ message: 'Add at least one desired role.', severity: 'warning' });
      return;
    }
    if (preferredLocations.length === 0) {
      showToast({ message: 'Add at least one preferred location.', severity: 'warning' });
      return;
    }
    if (remotePreferences.length === 0) {
      showToast({ message: 'Select at least one workplace preference.', severity: 'warning' });
      return;
    }
    if (!salaryCurrency) {
      showToast({ message: 'Choose a salary currency.', severity: 'warning' });
      return;
    }
    if (!immediateJoiner && !noticePeriodDays) {
      showToast({
        message: 'Set your notice period, or mark yourself as an immediate joiner.',
        severity: 'warning',
      });
      return;
    }

    try {
      await upsertProfile.mutateAsync({
        preferences: {
          desiredRoles,
          preferredLocations,
          remotePreferences,
          expectedSalary: {
            currency: salaryCurrency,
            ...(salaryFlexible
              ? {}
              : {
                  min: salaryMin ? Number(salaryMin) : undefined,
                  max: salaryMax ? Number(salaryMax) : undefined,
                }),
          },
          noticePeriodDays: immediateJoiner ? 0 : Number(noticePeriodDays),
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
      <Typography variant="h6">Your Auto Apply preferences</Typography>
      <Typography color="text.secondary" variant="body2">
        Complete this before tracking jobs. We use it to check fit and pick the right resume — not
        to submit anything without your review.
      </Typography>

      <Autocomplete
        freeSolo
        multiple
        onChange={(_event, value) =>
          setDesiredRoles(
            value.map((item) => (typeof item === 'string' ? item : item).trim()).filter(Boolean),
          )
        }
        options={ROLE_SUGGESTIONS}
        renderInput={(params) => (
          <TextField
            {...params}
            helperText="Select or type roles, then press Enter"
            label="Desired roles"
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            return <Chip key={key} label={option} size="small" {...tagProps} />;
          })
        }
        value={desiredRoles}
      />

      <Autocomplete
        freeSolo
        multiple
        onChange={(_event, value) =>
          setPreferredLocations(
            value.map((item) => (typeof item === 'string' ? item : item).trim()).filter(Boolean),
          )
        }
        options={LOCATION_SUGGESTIONS}
        renderInput={(params) => (
          <TextField
            {...params}
            helperText="Cities, countries, or regions you will consider"
            label="Preferred locations"
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            return <Chip key={key} label={option} size="small" {...tagProps} />;
          })
        }
        value={preferredLocations}
      />

      <Autocomplete
        multiple
        onChange={(_event, value) => setRemotePreferences(value.map((item) => item.value))}
        options={WORK_MODE_OPTIONS}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, value) => option.value === value.value}
        renderInput={(params) => (
          <TextField
            {...params}
            helperText="Select all workplace styles you are open to"
            label="Remote preference"
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            return <Chip key={key} label={option.label} size="small" {...tagProps} />;
          })
        }
        value={WORK_MODE_OPTIONS.filter((option) => remotePreferences.includes(option.value))}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={salaryFlexible}
            onChange={(event) => setSalaryFlexible(event.target.checked)}
          />
        }
        label="Salary is flexible (currency only)"
      />

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {!salaryFlexible && (
          <>
            <TextField
              label="Expected salary min"
              onChange={(event) => setSalaryMin(event.target.value)}
              sx={{ flex: 1, minWidth: 140 }}
              type="number"
              value={salaryMin}
            />
            <TextField
              label="Expected salary max"
              onChange={(event) => setSalaryMax(event.target.value)}
              sx={{ flex: 1, minWidth: 140 }}
              type="number"
              value={salaryMax}
            />
          </>
        )}
        <TextField
          label="Currency"
          onChange={(event) => setSalaryCurrency(event.target.value)}
          required
          select
          sx={{ minWidth: 120 }}
          value={salaryCurrency}
        >
          {SALARY_CURRENCIES.map((code) => (
            <MenuItem key={code} value={code}>
              {code}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <FormControlLabel
        control={
          <Checkbox
            checked={immediateJoiner}
            onChange={(event) => {
              setImmediateJoiner(event.target.checked);
              if (event.target.checked) setNoticePeriodDays('');
            }}
          />
        }
        label="Immediate joiner (available to start right away)"
      />

      {!immediateJoiner && (
        <TextField
          helperText="How many days of notice you need to give your current employer"
          label="Notice period (days)"
          onChange={(event) => setNoticePeriodDays(event.target.value)}
          type="number"
          value={noticePeriodDays}
        />
      )}

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
        label="I need visa sponsorship"
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
