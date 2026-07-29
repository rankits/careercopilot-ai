import { AuthForm } from '@/components/organisms/AuthForm';
import { AuthPageLayout } from '@/components/organisms/AuthPageLayout';

import {
  useRegister,
  type RegisterFormValues,
} from '@/features/auth/hooks/useRegister';

import { ROUTES } from '@/constants/routes';

export function RegisterPage() {
  const { error, goToLogin, isSubmitting, submit } = useRegister();

  return (
    <AuthPageLayout error={error} mode="register">
      <AuthForm<RegisterFormValues>
        alternateActionHref={ROUTES.LOGIN}
        isSubmitting={isSubmitting}
        mode="register"
        onAlternateActionClick={goToLogin}
        onValidSubmit={(values) => void submit(values)}
      />
    </AuthPageLayout>
  );
}
