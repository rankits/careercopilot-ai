import { AuthForm } from '@/components/organisms/AuthForm';

import {
  useRegister,
  type RegisterFormValues,
} from '@/features/auth/hooks/useRegister';

import { ROUTES } from '@/constants/routes';
import { Box } from '@/lib/material';

export function RegisterPage() {
  const { error, goToLogin, isSubmitting, submit } = useRegister();

  return (
    <Box component="main">
      {error ? (
        <Box role="alert" sx={{ color: 'error.main', mb: 2 }}>
          {error}
        </Box>
      ) : null}
      <AuthForm<RegisterFormValues>
        alternateActionHref={ROUTES.LOGIN}
        isSubmitting={isSubmitting}
        mode="register"
        onAlternateActionClick={goToLogin}
        onValidSubmit={(values) => void submit(values)}
      />
    </Box>
  );
}
