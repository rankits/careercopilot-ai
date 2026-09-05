import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAppDispatch } from '@/hooks/redux';

import { ROUTES } from '@/constants/routes';
import { establishSession } from '@/features/auth/authSlice';
import { authService } from '@/features/auth/services/auth.service';
import { getAuthErrorMessage } from '@/features/auth/utils/apiError';
import { getPostAuthRoute } from '@/features/auth/utils/getPostAuthRoute';
import { Box, CircularProgress, Typography } from '@/lib/material';

export function GoogleAuthCallbackPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const oauthError = searchParams.get('error');
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (oauthError) {
      setErrorMessage('Google sign-in was cancelled or denied.');
      return;
    }

    if (!code || !state) {
      setErrorMessage('Missing Google authorization details.');
      return;
    }

    void (async () => {
      try {
        const session = await authService.completeGoogleLogin({ code, state });
        dispatch(establishSession(session));
        const next =
          session.returnPath && session.returnPath.startsWith('/')
            ? session.returnPath
            : getPostAuthRoute(session.user.isProfileCreated === true);
        void navigate(next, { replace: true });
      } catch (error) {
        setErrorMessage(
          getAuthErrorMessage(error, 'Unable to complete Google sign-in. Please try again.'),
        );
      }
    })();
  }, [dispatch, navigate, searchParams]);

  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        justifyContent: 'center',
        minHeight: '100vh',
        px: 3,
        textAlign: 'center',
      }}
    >
      {errorMessage ? (
        <>
          <Typography component="h1" variant="h6">
            Google sign-in failed
          </Typography>
          <Typography color="text.secondary">{errorMessage}</Typography>
          <Typography
            component="a"
            href={ROUTES.LOGIN}
            sx={{ color: 'primary.main', mt: 1, textDecoration: 'underline' }}
          >
            Back to login
          </Typography>
        </>
      ) : (
        <>
          <CircularProgress size={36} />
          <Typography color="text.secondary">Completing Google sign-in…</Typography>
        </>
      )}
    </Box>
  );
}
