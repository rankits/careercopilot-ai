import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@/hooks/redux';

import { ROUTES } from '@/constants/routes';
import { login } from '@/features/auth/authSlice';
import type { LoginPayload } from '@/features/auth/types/auth.types';
import { getAuthErrorMessage } from '@/features/auth/utils/apiError';
import { getPostAuthRoute } from '@/features/auth/utils/getPostAuthRoute';

export interface LoginFormValues extends LoginPayload {
  rememberMe: boolean;
}

export interface LoginSubmitResult {
  errorMessage?: string;
  succeeded: boolean;
}

export function useLogin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => dispatch(login(payload)).unwrap(),
    mutationKey: ['auth', 'login'],
    onSuccess: ({ user }) => {
      const returnTo =
        (location.state as { from?: string } | null)?.from ??
        new URLSearchParams(location.search).get('returnTo');

      if (returnTo) {
        void navigate(returnTo, { replace: true });
        return;
      }

      void navigate(getPostAuthRoute(user.isProfileCreated === true), { replace: true });
    },
  });

  const goToRegister = () => {
    void navigate(ROUTES.REGISTER);
  };

  const submit = async (values: LoginFormValues): Promise<LoginSubmitResult> => {
    if (loginMutation.isPending) {
      return { errorMessage: 'Login already in progress', succeeded: false };
    }

    try {
      await loginMutation.mutateAsync({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        rememberMe: values.rememberMe,
      });

      return { succeeded: true };
    } catch (error) {
      return {
        errorMessage: getAuthErrorMessage(error, 'Unable to log in. Please try again.'),
        succeeded: false,
      };
    }
  };

  return {
    goToRegister,
    isSubmitting: loginMutation.isPending,
    submit,
  };
}
