import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { resumeService } from '@/features/resume/services/resume.service';

import { Box, Chip, Paper, TextField, Typography } from '@/lib/material';

import { PersonalContactSection } from './PersonalContactSection';

const profileKey = ['resume-profile', 'me'] as const;

export function PersonalSetupSection() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const profileQuery = useQuery({ queryKey: profileKey, queryFn: () => resumeService.getMyProfile() });
  const [preferredName, setPreferredName] = useState('');
  const [authorizationCountry, setAuthorizationCountry] = useState('');

  useEffect(() => {
    const savedPreferredName = profileQuery.data?.personalDetails.preferredName;
    const savedAuthorizationCountry =
      profileQuery.data?.personalDetails.workAuthorizationCountry;
    setPreferredName(typeof savedPreferredName === 'string' ? savedPreferredName : '');
    setAuthorizationCountry(
      typeof savedAuthorizationCountry === 'string' ? savedAuthorizationCountry : '',
    );
  }, [profileQuery.data]);

  const updateProfile = useMutation({
    mutationFn: () =>
      resumeService.updateProfile({
        personalDetails: {
          ...(profileQuery.data?.personalDetails ?? {}),
          preferredName: preferredName.trim(),
          workAuthorizationCountry: authorizationCountry.trim(),
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileKey });
      showToast({ message: 'Basic identity saved.', severity: 'success' });
    },
    onError: () => showToast({ message: 'Unable to save basic identity.', severity: 'error' }),
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PersonalContactSection />
      <Paper sx={{ borderRadius: 2, p: { xs: 2, sm: 3 } }} variant="outlined">
        <Box sx={{ alignItems: 'center', display: 'flex', gap: 1, mb: 0.5 }}>
          <Typography component="h2" sx={{ fontSize: 18, fontWeight: 700 }}>
            Basic identity
          </Typography>
          <Chip label="Optional" size="small" />
        </Box>
        <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
          This helps us personalize applications and communicate using your preferred details.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          }}
        >
          <TextField
            fullWidth
            label="Work authorization country"
            onChange={(event) => setAuthorizationCountry(event.target.value)}
            value={authorizationCountry}
          />
          <TextField
            fullWidth
            label="Preferred name"
            onChange={(event) => setPreferredName(event.target.value)}
            value={preferredName}
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <Button isLoading={updateProfile.isPending} onClick={() => updateProfile.mutate()}>
            Save identity
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
