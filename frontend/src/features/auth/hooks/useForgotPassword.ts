import { useMutation } from '@tanstack/react-query';

import { authService } from '@/features/auth/services/auth.service';
import type {
  ForgotPasswordPayload,
  ResetPasswordPayload,
  VerifyForgotPasswordOtpPayload,
} from '@/features/auth/types/auth.types';
import { getAuthErrorMessage } from '@/features/auth/utils/apiError';

export interface ForgotPasswordActionResult {
  errorMessage?: string;
  message?: string;
  succeeded: boolean;
}

export function useForgotPassword() {
  const requestResetMutation = useMutation({
    mutationFn: (payload: ForgotPasswordPayload) => authService.forgotPassword(payload),
    mutationKey: ['auth', 'forgot-password'],
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (payload: VerifyForgotPasswordOtpPayload) =>
      authService.verifyForgotPasswordOtp(payload),
    mutationKey: ['auth', 'forgot-password-verify-otp'],
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (payload: ResetPasswordPayload) => authService.resetPassword(payload),
    mutationKey: ['auth', 'reset-password'],
  });

  const requestReset = async (email: string): Promise<ForgotPasswordActionResult> => {
    if (requestResetMutation.isPending) {
      return { errorMessage: 'Request already in progress', succeeded: false };
    }

    try {
      const result = await requestResetMutation.mutateAsync({ email });
      if (result.status === 'error') {
        return {
          errorMessage: result.message || 'Unable to send reset code. Please try again.',
          succeeded: false,
        };
      }
      return { message: result.message, succeeded: true };
    } catch (error) {
      return {
        errorMessage: getAuthErrorMessage(error, 'Unable to send reset code. Please try again.'),
        succeeded: false,
      };
    }
  };

  const verifyOtp = async (
    payload: VerifyForgotPasswordOtpPayload,
  ): Promise<ForgotPasswordActionResult> => {
    if (verifyOtpMutation.isPending) {
      return { errorMessage: 'Verification already in progress', succeeded: false };
    }

    try {
      const result = await verifyOtpMutation.mutateAsync(payload);
      if (result.status === 'error') {
        return {
          errorMessage: result.message || 'Invalid or expired verification code.',
          succeeded: false,
        };
      }
      return { message: result.message, succeeded: true };
    } catch (error) {
      return {
        errorMessage: getAuthErrorMessage(error, 'Invalid or expired verification code.'),
        succeeded: false,
      };
    }
  };

  const resetPassword = async (
    payload: ResetPasswordPayload,
  ): Promise<ForgotPasswordActionResult> => {
    if (resetPasswordMutation.isPending) {
      return { errorMessage: 'Password reset already in progress', succeeded: false };
    }

    try {
      const result = await resetPasswordMutation.mutateAsync(payload);
      if (result.status === 'error') {
        return {
          errorMessage: result.message || 'Unable to reset password. Please try again.',
          succeeded: false,
        };
      }
      return { message: result.message, succeeded: true };
    } catch (error) {
      return {
        errorMessage: getAuthErrorMessage(error, 'Unable to reset password. Please try again.'),
        succeeded: false,
      };
    }
  };

  return {
    isRequestingReset: requestResetMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending,
    isVerifyingOtp: verifyOtpMutation.isPending,
    requestReset,
    resetPassword,
    verifyOtp,
  };
}
