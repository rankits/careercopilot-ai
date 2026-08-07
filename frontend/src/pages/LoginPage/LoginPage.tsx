import { AuthForm } from '@/components/organisms/AuthForm';
import { AuthPageLayout } from '@/components/organisms/AuthPageLayout';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useGoogleLogin } from '@/features/auth/hooks/useGoogleLogin';
import { useLogin, type LoginFormValues } from '@/features/auth/hooks/useLogin';

import { ROUTES } from '@/constants/routes';

export function LoginPage() {
  const { goToRegister, isSubmitting, submit } = useLogin();
  const { isStarting, start } = useGoogleLogin();
  const { showToast } = useToast();

  return (
    <AuthPageLayout mode="login">
      <AuthForm<LoginFormValues>
        alternateActionHref={ROUTES.REGISTER}
        isSubmitting={isSubmitting || isStarting}
        mode="login"
        onAlternateActionClick={goToRegister}
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
            showToast({ message: 'Signed in successfully', severity: 'success' });
          } else {
            showToast({
              message: result.errorMessage ?? 'Unable to log in. Please try again.',
              severity: 'error',
            });
          }
        }}
      />
    </AuthPageLayout>
  );
}
