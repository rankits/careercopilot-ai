import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { connectedAccountsService } from '@/services/connected-accounts.service';

export function OAuthResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const state = searchParams.get('state');
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const processed = useRef(false);

  const {
    mutate,
    isError,
    error: mutationError,
  } = useMutation({
    mutationFn: ({ s, c }: { s: string; c: string }) =>
      connectedAccountsService.handleGoogleCallback(s, c),
    onSuccess: () => {
      setTimeout(() => {
        void navigate('/settings/connected-accounts', { replace: true });
      }, 1500);
    },
  });

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    if (error) {
      return;
    }

    if (state && code) {
      mutate({ s: state, c: code });
    }
  }, [state, code, error, mutate]);

  if (error) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, textAlign: 'center', mt: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to connect account: {error}
        </Alert>
        <Typography variant="body1">
          You can close this window or return to the application.
        </Typography>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, textAlign: 'center', mt: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to verify account connection:{' '}
          {mutationError instanceof Error ? mutationError.message : 'Unknown error'}
        </Alert>
        <Typography variant="body1">Please try connecting your account again.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, textAlign: 'center', mt: 8 }}>
      <CircularProgress size={48} sx={{ mb: 3 }} />
      <Typography variant="h6">Completing account connection...</Typography>
      <Typography color="text.secondary" variant="body2">
        Please wait while we securely link your Google account.
      </Typography>
    </Box>
  );
}
