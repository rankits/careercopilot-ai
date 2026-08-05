import { AuthForm } from '@/components/organisms/AuthForm';
import { AuthPageLayout } from '@/components/organisms/AuthPageLayout';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useLogin, type LoginFormValues } from '@/features/auth/hooks/useLogin';

import { ROUTES } from '@/constants/routes';

export function LoginPage() {
  const { goToRegister, isSubmitting, submit } = useLogin();
  const { showToast } = useToast();

  return (
    <AuthPageLayout mode="login">
      <AuthForm<LoginFormValues>
        alternateActionHref={ROUTES.REGISTER}
        isSubmitting={isSubmitting}
        mode="login"
        onAlternateActionClick={goToRegister}
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
    </AuthPageLayout>
  );
}
