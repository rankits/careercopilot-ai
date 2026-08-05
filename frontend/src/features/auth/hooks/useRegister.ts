import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';
import { authService } from '@/features/auth/services/auth.service';
import type { RegisterPayload } from '@/features/auth/types/auth.types';
import { getAuthErrorMessage } from '@/features/auth/utils/apiError';

export interface RegisterFormValues extends Omit<RegisterPayload, 'phone'> {
  confirmPassword: string;
  phone: string;
}

export interface RegisterSubmitResult {
  errorMessage?: string;
  succeeded: boolean;
}

export function useRegister() {
  const navigate = useNavigate();
  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    mutationKey: ['auth', 'register'],
    onSuccess: () => {
      void navigate(ROUTES.LOGIN, { replace: true });
    },
  });
  const goToLogin = () => {
    void navigate(ROUTES.LOGIN);
  };

  const submit = async (values: RegisterFormValues): Promise<RegisterSubmitResult> => {
    if (registerMutation.isPending) {
      return { succeeded: false };
    }

    try {
      const phone = values.phone.replace(/\D/g, '');
      await registerMutation.mutateAsync({
        email: values.email.trim().toLowerCase(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        password: values.password,
        ...(phone ? { phone } : {}),
      });

      return { succeeded: true };
    } catch (error) {
      return {
        errorMessage: getAuthErrorMessage(
          error,
          'Unable to create your account. Please try again.',
        ),
        succeeded: false,
      };
    }
  };

  return {
    goToLogin,
    isSubmitting: registerMutation.isPending,
    submit,
  };
}
