import { AuthForm } from '@/components/organisms/AuthForm';

import { useLogin, type LoginFormValues } from '@/features/auth/hooks/useLogin';

import { ROUTES } from '@/constants/routes';
import { Box } from '@/lib/material';

export function LoginPage() {
  const { error, goToRegister, isSubmitting, submit } = useLogin();

  return (
    <Box component="main">
      {error ? (
        <Box role="alert" sx={{ mb: 2 }}>
          {error}
        </Box>
      ) : null}
      <AuthForm<LoginFormValues>
        alternateActionHref={ROUTES.REGISTER}
        isSubmitting={isSubmitting}
        mode="login"
        onAlternateActionClick={goToRegister}
        onValidSubmit={(values) => void submit(values)}
      />
    </Box>
  );
}
