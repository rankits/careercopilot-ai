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
  const [isForgotPasswordDialogOpen, setIsForgotPasswordDialogOpen] = useState(false);

  function openForgotPasswordDialog() {
    setIsForgotPasswordDialogOpen(true);
  }

  function closeForgotPasswordDialog() {
    setIsForgotPasswordDialogOpen(false);
  }

  return (
    <>
      <AuthPageLayout mode="login">
        <AuthForm<LoginFormValues>
          alternateActionHref={ROUTES.REGISTER}
          isSubmitting={isSubmitting}
          mode="login"
          onAlternateActionClick={goToRegister}
          onForgotPasswordClick={openForgotPasswordDialog}
          onValidSubmit={async (values) => {
            const succeeded = await submit(values);

            if (succeeded) {
              showToast({ message: 'Signed in successfully', severity: 'success' });
            } else {
              showToast({
                message: 'Unable to log in. Please try again.',
                severity: 'error',
              });
            }
          }}
        />
      </AuthPageLayout>
      <ForgotPasswordDialog onClose={closeForgotPasswordDialog} open={isForgotPasswordDialogOpen} />
    </>
  );
}
