import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';
import { authService } from '@/features/auth/services/auth.service';
import type { RegisterPayload } from '@/features/auth/types/auth.types';

export interface RegisterFormValues extends RegisterPayload {
  confirmPassword: string;
}

export function useRegister() {
  const navigate = useNavigate();
  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    mutationKey: ['auth', 'register'],
    onSuccess: () => {
      void navigate(ROUTES.PROFILE, { replace: true });
    },
  });
  const goToLogin = () => {
    void navigate(ROUTES.LOGIN);
  };

  const submit = async (values: RegisterFormValues) => {
    if (registerMutation.isPending) {
      return;
    }

    await registerMutation.mutateAsync({
        email: values.email.trim().toLowerCase(),
        name: values.name.trim(),
        password: values.password,
        phoneNumber: values.phoneNumber.replace(/[^\d+]/g, ''),
      }).catch(() => undefined);
  };

  return {
    error: registerMutation.isError ? 'Unable to create your account. Please try again.' : null,
    goToLogin,
    isSubmitting: registerMutation.isPending,
    submit,
  };
}
