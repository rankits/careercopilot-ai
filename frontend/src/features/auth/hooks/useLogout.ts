import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useAppDispatch } from '@/hooks/redux';

import { ROUTES } from '@/constants/routes';
import { logout as clearSession } from '@/features/auth/authSlice';
import { authService } from '@/features/auth/services/auth.service';
import { queryClient } from '@/services/queryClient';

export function useLogout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    mutationKey: ['auth', 'logout'],
  });

  const logout = async () => {
    if (logoutMutation.isPending) {
      return;
    }

    dispatch(clearSession());
    queryClient.clear();
    void navigate(ROUTES.LOGIN, { replace: true });

    try {
      const { message } = await logoutMutation.mutateAsync();
      showToast({ message, severity: 'success' });
    } catch {
      showToast({
        message: 'Signed out locally. Server logout could not be completed.',
        severity: 'warning',
      });
    }
  };

  return {
    isLoggingOut: logoutMutation.isPending,
    logout,
  };
}
