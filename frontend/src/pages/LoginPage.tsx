import { AuthForm } from '@/components/organisms/AuthForm';
import { AuthPageLayout } from '@/components/organisms/AuthPageLayout';

import { useLogin, type LoginFormValues } from '@/features/auth/hooks/useLogin';

import { ROUTES } from '@/constants/routes';

export function LoginPage() {
  const { error, goToRegister, isSubmitting, submit } = useLogin();

  return (
    <AuthPageLayout error={error} mode="login">
      <AuthForm<LoginFormValues>
        alternateActionHref={ROUTES.REGISTER}
        isSubmitting={isSubmitting}
        mode="login"
        onAlternateActionClick={goToRegister}
        onValidSubmit={(values) => void submit(values)}
      />
    </AuthPageLayout>
  );
}
