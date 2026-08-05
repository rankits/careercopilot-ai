import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';
import {
  useUpsertApplicationAnswer,
} from '@/features/auto-apply/hooks/useApplicationAnswers';
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

import { SetupSectionHeading } from './SetupSectionHeading';
import { useSetupDirty } from './SetupDirtyContext';

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

const MAX_TAG_COUNT = 20;

type FieldErrors = Partial<
  Record<'desiredRoles' | 'preferredLocations' | 'remotePreferences' | 'noticePeriod' | 'salaryMax', string>
>;

export function JobPreferencesSection() {
  const { data: profile, isLoading } = useCandidateProfile();
  const upsertProfile = useUpsertCandidateProfile();
  const upsertAnswer = useUpsertApplicationAnswer();
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
  const [errors, setErrors] = useState<FieldErrors>({});

  const savedSnapshot = useMemo(() => {
    if (!profile) {
      return {
        desiredRoles: [] as string[],
        preferredLocations: [] as string[],
        remotePreferences: [] as WorkModePreference[],
        salaryMin: '',
        salaryMax: '',
        salaryCurrency: '',
        salaryFlexible: false,
        immediateJoiner: false,
        noticePeriodDays: '',
        willingToRelocate: false,
      };
    }
    const min = profile.preferences.expectedSalary?.min;
    const max = profile.preferences.expectedSalary?.max;
    const notice = profile.preferences.noticePeriodDays;
    return {
      desiredRoles: profile.preferences.desiredRoles ?? [],
      preferredLocations: profile.preferences.preferredLocations ?? [],
      remotePreferences: resolveRemotePreferences(profile.preferences),
      salaryMin: min != null ? String(min) : '',
      salaryMax: max != null ? String(max) : '',
      salaryCurrency: profile.preferences.expectedSalary?.currency ?? '',
      salaryFlexible:
        min == null && max == null && Boolean(profile.preferences.expectedSalary?.currency),
      immediateJoiner: notice === 0,
      noticePeriodDays: notice != null && notice > 0 ? String(notice) : '',
      willingToRelocate: profile.preferences.willingToRelocate ?? false,
    };
  }, [profile]);

  useEffect(() => {
    setDesiredRoles(savedSnapshot.desiredRoles);
    setPreferredLocations(savedSnapshot.preferredLocations);
    setRemotePreferences(savedSnapshot.remotePreferences);
    setSalaryMin(savedSnapshot.salaryMin);
    setSalaryMax(savedSnapshot.salaryMax);
    setSalaryCurrency(savedSnapshot.salaryCurrency);
    setSalaryFlexible(savedSnapshot.salaryFlexible);
    setImmediateJoiner(savedSnapshot.immediateJoiner);
    setNoticePeriodDays(savedSnapshot.noticePeriodDays);
    setWillingToRelocate(savedSnapshot.willingToRelocate);
    setErrors({});
  }, [savedSnapshot]);

  const isDirty = useMemo(() => {
    return (
      JSON.stringify(desiredRoles) !== JSON.stringify(savedSnapshot.desiredRoles) ||
      JSON.stringify(preferredLocations) !== JSON.stringify(savedSnapshot.preferredLocations) ||
      JSON.stringify(remotePreferences) !== JSON.stringify(savedSnapshot.remotePreferences) ||
      salaryMin !== savedSnapshot.salaryMin ||
      salaryMax !== savedSnapshot.salaryMax ||
      salaryCurrency !== savedSnapshot.salaryCurrency ||
      salaryFlexible !== savedSnapshot.salaryFlexible ||
      immediateJoiner !== savedSnapshot.immediateJoiner ||
      noticePeriodDays !== savedSnapshot.noticePeriodDays ||
      willingToRelocate !== savedSnapshot.willingToRelocate
    );
  }, [
    desiredRoles,
    immediateJoiner,
    noticePeriodDays,
    preferredLocations,
    remotePreferences,
    salaryCurrency,
    salaryFlexible,
    salaryMax,
    salaryMin,
    savedSnapshot,
    willingToRelocate,
  ]);

  useSetupDirty('preferences', isDirty);

  const validateSalaryMax = (maxValue: string, minValue: string) => {
    if (!maxValue || !minValue) return undefined;
    if (Number(maxValue) < Number(minValue)) {
      return 'Max must be greater than or equal to min.';
    }
    return undefined;
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (desiredRoles.length === 0) next.desiredRoles = 'Add at least one.';
    if (preferredLocations.length === 0) next.preferredLocations = 'Add at least one.';
    if (remotePreferences.length === 0) {
      next.remotePreferences = 'Select at least one work mode.';
    }
    if (!salaryCurrency) {
      next.salaryMax = 'Choose a salary currency.';
    }
    const salaryMaxError = validateSalaryMax(salaryMax, salaryMin);
    if (salaryMaxError) next.salaryMax = salaryMaxError;
    if (!immediateJoiner && !noticePeriodDays) {
      next.noticePeriod = 'Enter a number of days, or check Immediate joiner.';
    }
    return next;
  };

  const handleSave = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const noticeDays = immediateJoiner ? 0 : Number(noticePeriodDays);

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
          noticePeriodDays: noticeDays,
          willingToRelocate,
        },
      });

      await upsertAnswer.mutateAsync({
        questionKey: 'notice_period_days',
        answer: String(noticeDays),
        autoSubmitAllowed: false,
      });

      showToast({ message: 'Job preferences saved.', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't save your details. Try again.",
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
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 640 }} variant="outlined">
      <SetupSectionHeading required sectionId="preferences" title="Job preferences" />

      <Autocomplete
        freeSolo
        multiple
        onChange={(_event, value) => {
          const next = value
            .map((item) => (typeof item === 'string' ? item : item).trim())
            .filter(Boolean);
          if (next.length > MAX_TAG_COUNT) {
            setErrors((prev) => ({ ...prev, desiredRoles: "You've reached the 20-item limit." }));
            setDesiredRoles(next.slice(0, MAX_TAG_COUNT));
            return;
          }
          setErrors((prev) => ({ ...prev, desiredRoles: undefined }));
          setDesiredRoles(next);
        }}
        options={ROLE_SUGGESTIONS}
        renderInput={(params) => (
          <TextField
            {...params}
            error={Boolean(errors.desiredRoles)}
            helperText={
              errors.desiredRoles ?? "Add roles you're interested in, e.g. 'Product Manager'."
            }
            label="Desired roles"
            required
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
        onChange={(_event, value) => {
          const next = value
            .map((item) => (typeof item === 'string' ? item : item).trim())
            .filter(Boolean);
          if (next.length > MAX_TAG_COUNT) {
            setErrors((prev) => ({
              ...prev,
              preferredLocations: "You've reached the 20-item limit.",
            }));
            setPreferredLocations(next.slice(0, MAX_TAG_COUNT));
            return;
          }
          setErrors((prev) => ({ ...prev, preferredLocations: undefined }));
          setPreferredLocations(next);
        }}
        options={LOCATION_SUGGESTIONS}
        renderInput={(params) => (
          <TextField
            {...params}
            error={Boolean(errors.preferredLocations)}
            helperText={
              errors.preferredLocations ??
              "Add cities, regions, or 'Remote' if location doesn't matter."
            }
            label="Preferred locations"
            required
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
        onChange={(_event, value) => {
          setRemotePreferences(value.map((item) => item.value));
          setErrors((prev) => ({ ...prev, remotePreferences: undefined }));
        }}
        options={WORK_MODE_OPTIONS}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, value) => option.value === value.value}
        renderInput={(params) => (
          <TextField
            {...params}
            error={Boolean(errors.remotePreferences)}
            helperText={errors.remotePreferences ?? 'Select all that apply.'}
            label="Work mode"
            required
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

      <Typography variant="subtitle2">Expected salary (optional)</Typography>
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
              error={Boolean(errors.salaryMax)}
              helperText={errors.salaryMax}
              label="Expected salary max"
              onBlur={() => {
                const salaryMaxError = validateSalaryMax(salaryMax, salaryMin);
                setErrors((prev) => ({ ...prev, salaryMax: salaryMaxError }));
              }}
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
      <Typography color="text.secondary" variant="caption">
        Helps us flag jobs with a mismatched range. Never shared with employers automatically.
      </Typography>

      <Typography variant="subtitle2">Notice period</Typography>
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
          error={Boolean(errors.noticePeriod)}
          helperText={errors.noticePeriod ?? 'How soon could you start a new role?'}
          label="Notice period (days)"
          onChange={(event) => setNoticePeriodDays(event.target.value)}
          required
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

      <Box>
        <Button
          disabled={!isDirty}
          isLoading={upsertProfile.isPending || upsertAnswer.isPending}
          onClick={() => void handleSave()}
        >
          Save
        </Button>
      </Box>
    </Paper>
  );
}
