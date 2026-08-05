import { useState } from 'react';

import { AuthForm } from '@/components/organisms/AuthForm';
import { AuthPageLayout } from '@/components/organisms/AuthPageLayout';
import { ForgotPasswordDialog } from '@/components/organisms/ForgotPasswordDialog';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useLogin, type LoginFormValues } from '@/features/auth/hooks/useLogin';

import { ROUTES } from '@/constants/routes';

export function LoginPage() {
  const { goToRegister, isSubmitting, submit } = useLogin();
  const { showToast } = useToast();
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  return (
    <AuthPageLayout mode="login">
      <AuthForm<LoginFormValues>
        alternateActionHref={ROUTES.REGISTER}
        isSubmitting={isSubmitting}
        mode="login"
        onAlternateActionClick={goToRegister}
        onForgotPasswordClick={() => setIsForgotPasswordOpen(true)}
        onValidSubmit={async (values) => {
          const result = await submit(values);

          if (result.ok) {
            showToast({ message: 'Signed in successfully', severity: 'success' });
          } else {
            showToast({
              message: result.error,
              severity: 'error',
            });
          }
        }}
      />
      <ForgotPasswordDialog
        open={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </AuthPageLayout>
  );
}
