import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';
import {
  useApplicationAnswers,
  useUpsertApplicationAnswer,
} from '@/features/auto-apply/hooks/useApplicationAnswers';
import {
  useCandidateProfile,
  useUpsertCandidateProfile,
} from '@/features/auto-apply/hooks/useCandidateProfile';
import {
  Box,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
} from '@/lib/material';

import { SetupSectionHeading } from './SetupSectionHeading';
import { useSetupDirty } from './SetupDirtyContext';
import {
  COUNTRY_OPTIONS,
  sponsorshipChoiceFromProfile,
  WORK_AUTHORIZATION_OPTIONS,
  type SponsorshipChoice,
} from './setupFormUtils';

export function WorkAuthorizationSection() {
  const { data: answers, isLoading: answersLoading } = useApplicationAnswers();
  const { data: profile, isLoading: profileLoading } = useCandidateProfile();
  const upsertAnswer = useUpsertApplicationAnswer();
  const upsertProfile = useUpsertCandidateProfile();
  const { showToast } = useToast();

  const [workAuthorization, setWorkAuthorization] = useState('');
  const [sponsorshipChoice, setSponsorshipChoice] = useState<SponsorshipChoice>('unknown');
  const [workAuthError, setWorkAuthError] = useState<string | undefined>();

  const countryLabel =
    COUNTRY_OPTIONS.find((country) => country.code === profile?.preferences.currentCountry)
      ?.label ?? 'your country';

  const savedSnapshot = useMemo(
    () => ({
      workAuthorization:
        answers?.find((answer) => answer.questionKey === 'work_authorization')?.answer ?? '',
      sponsorshipChoice: sponsorshipChoiceFromProfile(profile?.preferences.requiresSponsorship),
    }),
    [answers, profile?.preferences.requiresSponsorship],
  );

  useEffect(() => {
    setWorkAuthorization(savedSnapshot.workAuthorization);
    setSponsorshipChoice(savedSnapshot.sponsorshipChoice);
    setWorkAuthError(undefined);
  }, [savedSnapshot]);

  const isDirty =
    workAuthorization !== savedSnapshot.workAuthorization ||
    sponsorshipChoice !== savedSnapshot.sponsorshipChoice;

  useSetupDirty('work-auth', isDirty);

  const handleSave = async () => {
    if (!workAuthorization) {
      setWorkAuthError('Choose one of the options above.');
      return;
    }
    setWorkAuthError(undefined);

    try {
      await upsertAnswer.mutateAsync({
        questionKey: 'work_authorization',
        answer: workAuthorization,
        autoSubmitAllowed: false,
      });

      if (sponsorshipChoice === 'yes') {
        await upsertProfile.mutateAsync({ preferences: { requiresSponsorship: true } });
      } else if (sponsorshipChoice === 'no') {
        await upsertProfile.mutateAsync({ preferences: { requiresSponsorship: false } });
      } else if (sponsorshipChoice !== savedSnapshot.sponsorshipChoice) {
        await upsertProfile.mutateAsync({ preferences: { requiresSponsorship: null } });
      }
      showToast({ message: 'Work authorization details saved.', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't save your details. Try again.",
        severity: 'error',
      });
    }
  };

  if (answersLoading || profileLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 720 }} variant="outlined">
      <SetupSectionHeading
        helperText="This helps us flag jobs where sponsorship or authorization is a hard requirement. It never appears on any application without your review."
        required
        sectionId="work-auth"
        title="Work authorization & sponsorship"
      />

      <FormControl error={Boolean(workAuthError)} required>
        <FormLabel id="work-authorization-label">Work authorization</FormLabel>
        <RadioGroup
          aria-labelledby="work-authorization-label"
          onChange={(event) => setWorkAuthorization(event.target.value)}
          value={workAuthorization}
        >
          {WORK_AUTHORIZATION_OPTIONS.map((option) => (
            <FormControlLabel
              control={<Radio />}
              key={option.value}
              label={
                typeof option.label === 'function'
                  ? option.label(countryLabel)
                  : option.label
              }
              value={option.value}
            />
          ))}
        </RadioGroup>
        {workAuthError ? (
          <Box component="p" sx={{ color: 'error.main', fontSize: '0.75rem', m: 0, mt: 0.5 }}>
            {workAuthError}
          </Box>
        ) : null}
      </FormControl>

      <FormControl>
        <FormLabel id="sponsorship-label">Sponsorship</FormLabel>
        <RadioGroup
          aria-labelledby="sponsorship-label"
          onChange={(event) => setSponsorshipChoice(event.target.value as SponsorshipChoice)}
          value={sponsorshipChoice}
        >
          <FormControlLabel
            control={<Radio />}
            label="Yes, I'll need sponsorship"
            value="yes"
          />
          <FormControlLabel
            control={<Radio />}
            label="No, I don't need sponsorship"
            value="no"
          />
          <FormControlLabel control={<Radio />} label="Not sure yet" value="unknown" />
        </RadioGroup>
        <Box component="p" sx={{ color: 'text.secondary', fontSize: '0.875rem', m: 0, mt: 0.5 }}>
          Optional, but helps us avoid showing you jobs that explicitly can&apos;t sponsor.
        </Box>
      </FormControl>

      <Box>
        <Button disabled={!isDirty} isLoading={upsertAnswer.isPending || upsertProfile.isPending} onClick={() => void handleSave()}>
          Save
        </Button>
      </Box>
    </Paper>
  );
}
