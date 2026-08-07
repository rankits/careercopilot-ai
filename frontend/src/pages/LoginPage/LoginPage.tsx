import { useState } from 'react';

import { AuthForm } from '@/components/organisms/AuthForm';
import { AuthPageLayout } from '@/components/organisms/AuthPageLayout';
import { ForgotPasswordDialog } from '@/components/organisms/ForgotPasswordDialog';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useGoogleLogin } from '@/features/auth/hooks/useGoogleLogin';
import { useLogin, type LoginFormValues } from '@/features/auth/hooks/useLogin';

import { ROUTES } from '@/constants/routes';

export function LoginPage() {
  const { goToRegister, isSubmitting, submit } = useLogin();
  const { isStarting, start } = useGoogleLogin();
  const { showToast } = useToast();
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  return (
    <AuthPageLayout mode="login">
      <AuthForm<LoginFormValues>
        alternateActionHref={ROUTES.REGISTER}
        isSubmitting={isSubmitting || isStarting}
        mode="login"
        onAlternateActionClick={goToRegister}
        onForgotPasswordClick={() => setIsForgotPasswordOpen(true)}
        onGoogleConnect={() => {
          void (async () => {
            const result = await start();
            if (!result.succeeded) {
              showToast({
                message: result.errorMessage ?? 'Unable to start Google sign-in. Please try again.',
                severity: 'error',
              });
            }
          })();
        }}
        onLinkedInConnect={() => {
          showToast({
            message: 'LinkedIn sign-in is not available yet',
            severity: 'info',
          });
        }}
        onValidSubmit={async (values) => {
          const result = await submit(values);

          if (result.succeeded) {
            showToast({ message: 'Logged in successfully', severity: 'success' });
          } else {
            showToast({
              message: result.errorMessage ?? 'Unable to log in. Please try again.',
              severity: 'error',
            });
          }
        }}
      />
      <ForgotPasswordDialog
        open={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onPasswordResetSuccess={(message) => {
          showToast({ message, severity: 'success' });
        }}
      />
    </AuthPageLayout>
  );
}
