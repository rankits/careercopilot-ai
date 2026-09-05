import { useMutation } from '@tanstack/react-query';

import { authService } from '@/features/auth/services/auth.service';
import { getAuthErrorMessage } from '@/features/auth/utils/apiError';

export function useGoogleLogin() {
  const startMutation = useMutation({
    mutationFn: (returnPath?: string) =>
      authService.startGoogleLogin(returnPath ? { returnPath } : undefined),
    mutationKey: ['auth', 'google', 'start'],
  });

  const start = async (
    returnPath?: string,
  ): Promise<{ errorMessage?: string; succeeded: boolean }> => {
    if (startMutation.isPending) {
      return { errorMessage: 'Google sign-in already in progress', succeeded: false };
    }

    try {
      const { authorizationUrl } = await startMutation.mutateAsync(returnPath);
      window.location.assign(authorizationUrl);
      return { succeeded: true };
    } catch (error) {
      return {
        errorMessage: getAuthErrorMessage(
          error,
          'Unable to start Google sign-in. Please try again.',
        ),
        succeeded: false,
      };
    }
  };

  return {
    isStarting: startMutation.isPending,
    start,
  };
}
