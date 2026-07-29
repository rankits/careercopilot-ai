import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@/hooks/redux';

import { ROUTES } from '@/constants/routes';
import { login } from '@/features/auth/authSlice';
import type { LoginPayload } from '@/features/auth/types/auth.types';

export interface LoginFormValues extends LoginPayload {
  rememberMe: boolean;
}

export function useLogin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => dispatch(login(payload)).unwrap(),
    mutationKey: ['auth', 'login'],
    onSuccess: () => {
      void navigate(ROUTES.PROFILE, { replace: true });
    },
  });

  const goToRegister = () => {
    void navigate(ROUTES.REGISTER);
  };

  const submit = async (values: LoginFormValues) => {
    if (loginMutation.isPending) {
      return;
    }

    await loginMutation
      .mutateAsync({
          email: values.email.trim().toLowerCase(),
          password: values.password,
      })
      .catch(() => undefined);
  };

  return {
    error: loginMutation.isError ? 'Unable to log in. Please try again.' : null,
    goToRegister,
    isSubmitting: loginMutation.isPending,
    submit,
  };
}
