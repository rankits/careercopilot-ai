import { AuthForm } from '@/components/organisms/AuthForm';
import { AuthPageLayout } from '@/components/organisms/AuthPageLayout';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useRegister, type RegisterFormValues } from '@/features/auth/hooks/useRegister';

import { ROUTES } from '@/constants/routes';

export function RegisterPage() {
  const { goToLogin, isSubmitting, submit } = useRegister();
  const { showToast } = useToast();

  return (
    <AuthPageLayout mode="register">
      <AuthForm<RegisterFormValues>
        alternateActionHref={ROUTES.LOGIN}
        isSubmitting={isSubmitting}
        mode="register"
        onAlternateActionClick={goToLogin}
        onValidSubmit={async (values) => {
          const succeeded = await submit(values);

          if (succeeded) {
            showToast({ message: 'Account created successfully', severity: 'success' });
          } else {
            showToast({
              message: 'Unable to create your account. Please try again.',
              severity: 'error',
            });
          }
        }}
      />
    </AuthPageLayout>
  );
}
