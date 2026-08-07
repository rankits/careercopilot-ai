import { AuthForm } from '@/components/organisms/AuthForm';
import { AuthPageLayout } from '@/components/organisms/AuthPageLayout';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useGoogleLogin } from '@/features/auth/hooks/useGoogleLogin';
import { useRegister, type RegisterFormValues } from '@/features/auth/hooks/useRegister';

import { ROUTES } from '@/constants/routes';

export function RegisterPage() {
  const { goToLogin, isSubmitting, submit } = useRegister();
  const { isStarting, start } = useGoogleLogin();
  const { showToast } = useToast();

  return (
    <AuthPageLayout mode="register">
      <AuthForm<RegisterFormValues>
        alternateActionHref={ROUTES.LOGIN}
        isSubmitting={isSubmitting || isStarting}
        mode="register"
        onAlternateActionClick={goToLogin}
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
            showToast({ message: 'Create account successfully', severity: 'success' });
          } else {
            showToast({
              message: result.errorMessage ?? 'Unable to create your account. Please try again.',
              severity: 'error',
            });
          }
        }}
      />
    </AuthPageLayout>
  );
}
