import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { resumeService } from '@/features/resume/services/resume.service';
import { Box, Paper, TextField } from '@/lib/material';

import { PersonalContactSection } from './PersonalContactSection';
import { validateBasicIdentityFields } from './setupFormUtils';
import { SetupSectionHeading } from './SetupSectionHeading';

const profileKey = ['resume-profile', 'me'] as const;

type BasicIdentityField = 'preferredName' | 'authorizationCountry';
type BasicIdentityErrors = Partial<Record<BasicIdentityField, string>>;

export function PersonalSetupSection() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const profileQuery = useQuery({
    queryKey: profileKey,
    queryFn: () => resumeService.getMyProfile(),
  });
  const [preferredName, setPreferredName] = useState('');
  const [authorizationCountry, setAuthorizationCountry] = useState('');
  const [errors, setErrors] = useState<BasicIdentityErrors>({});
  const [touched, setTouched] = useState<Partial<Record<BasicIdentityField, boolean>>>({});

  const savedSnapshot = useMemo(
    () => ({
      preferredName:
        typeof profileQuery.data?.personalDetails.preferredName === 'string'
          ? profileQuery.data.personalDetails.preferredName
          : '',
      authorizationCountry:
        typeof profileQuery.data?.personalDetails.workAuthorizationCountry === 'string'
          ? profileQuery.data.personalDetails.workAuthorizationCountry
          : '',
    }),
    [profileQuery.data],
  );

  useEffect(() => {
    setPreferredName(savedSnapshot.preferredName);
    setAuthorizationCountry(savedSnapshot.authorizationCountry);
    setErrors({});
    setTouched({});
  }, [savedSnapshot]);

  const isDirty =
    preferredName !== savedSnapshot.preferredName ||
    authorizationCountry !== savedSnapshot.authorizationCountry;

  const updateProfile = useMutation({
    mutationFn: () =>
      resumeService.updateProfile({
        personalDetails: {
          ...(profileQuery.data?.personalDetails ?? {}),
          preferredName: preferredName.trim(),
          workAuthorizationCountry: authorizationCountry.trim().toUpperCase(),
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileKey });
      showToast({ message: 'Basic identity saved.', severity: 'success' });
    },
    onError: () => showToast({ message: 'Unable to save basic identity.', severity: 'error' }),
  });

  const showError = (field: BasicIdentityField) => (touched[field] ? errors[field] : undefined);

  const handleSave = () => {
    setTouched({
      preferredName: true,
      authorizationCountry: true,
    });

    const validationErrors = validateBasicIdentityFields({
      preferredName,
      authorizationCountry,
    });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (!isDirty) {
      return;
    }

    updateProfile.mutate();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PersonalContactSection />
      <Paper sx={{ borderRadius: 2, p: { xs: 2, sm: 3 } }} variant="outlined">
        <SetupSectionHeading
          headingId="setup-section-heading-basic-identity"
          helperText="This helps us personalize applications and communicate using your preferred details."
          required={false}
          sectionId="personal"
          title="Basic identity"
        />
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          }}
        >
          <TextField
            error={Boolean(showError('authorizationCountry'))}
            fullWidth
            helperText={showError('authorizationCountry')}
            label="Work authorization country"
            onBlur={() => setTouched((current) => ({ ...current, authorizationCountry: true }))}
            onChange={(event) => setAuthorizationCountry(event.target.value)}
            placeholder="US"
            value={authorizationCountry}
          />
          <TextField
            error={Boolean(showError('preferredName'))}
            fullWidth
            helperText={showError('preferredName')}
            label="Preferred name"
            onBlur={() => setTouched((current) => ({ ...current, preferredName: true }))}
            onChange={(event) => setPreferredName(event.target.value)}
            value={preferredName}
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <Button disabled={!isDirty} isLoading={updateProfile.isPending} onClick={handleSave}>
            Save identity
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
