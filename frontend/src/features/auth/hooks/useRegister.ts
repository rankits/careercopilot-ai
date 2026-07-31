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
      void navigate(ROUTES.LOGIN, { replace: true });
    },
  });
  const goToLogin = () => {
    void navigate(ROUTES.LOGIN);
  };

  const submit = async (values: RegisterFormValues) => {
    if (registerMutation.isPending) {
      return false;
    }

    try {
      await registerMutation.mutateAsync({
        email: values.email.trim().toLowerCase(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        password: values.password,
        phone: values.phone.replace(/[^\d+]/g, ''),
      });

      return true;
    } catch {
      return false;
    }
  };

  return {
    goToLogin,
    isSubmitting: registerMutation.isPending,
    submit,
  };
}
