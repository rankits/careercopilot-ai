import { useMemo, useState } from 'react';
import { useForm, type FieldValues, type Path, type Resolver } from 'react-hook-form';

import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';

import {
  ArrowForwardIcon,
  Box,
  Checkbox,
  EmailOutlinedIcon,
  FormControlLabel,
  Link,
  LockOutlinedIcon,
  PersonOutlineIcon,
  PhoneOutlinedIcon,
  Typography,
  VisibilityOffOutlinedIcon,
  VisibilityOutlinedIcon,
  yupResolver,
} from '@/lib/material';

import { SocialConnectButton } from '../SocialConnectButton';

import { AUTH_FORM_CONTENT, AUTH_FORM_FIELDS, AUTH_FORM_VALIDATION_SCHEMAS } from './constants';
import type { AuthFieldIcon, AuthFieldIconMap, AuthFormField, AuthFormProps } from './interfaces';
import { authFormSx } from './styles';

const fieldIcons: AuthFieldIconMap = {
  email: EmailOutlinedIcon,
  lock: LockOutlinedIcon,
  person: PersonOutlineIcon,
  phone: PhoneOutlinedIcon,
  visibilityOff: VisibilityOffOutlinedIcon,
};

const PASSWORD_FIELDS = new Set(['password', 'confirmPassword']);
const FIELD_MAX_LENGTHS: Record<string, number> = {
  firstName: 80,
  lastName: 80,
  email: 300,
  phone: 10,
  password: 128,
  confirmPassword: 128,
};
function renderIcon(icon?: AuthFieldIcon) {
  if (!icon) {
    return undefined;
  }

  const Icon = fieldIcons[icon];

  return <Icon fontSize="small" />;
}

function sanitizePhoneNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function AuthForm<TFormValues extends FieldValues = FieldValues>({
  alternateActionHref = '#',
  extraFields = [],
  forgotPasswordHref = '#',
  isSubmitting = false,
  mode = 'login',
  onAlternateActionClick,
  onForgotPasswordClick,
  onGoogleConnect,
  onLinkedInConnect,
  onSubmit,
  onValidSubmit,
  showSocialLogin = true,
  validationSchema,
}: AuthFormProps<TFormValues>) {
  const content = AUTH_FORM_CONTENT[mode];
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const fields = useMemo<AuthFormField[]>(
    () => [...AUTH_FORM_FIELDS[mode], ...extraFields],
    [extraFields, mode],
  );
  const schema = validationSchema ?? AUTH_FORM_VALIDATION_SCHEMAS[mode];
  const {
    formState: { errors },
    handleSubmit,
    register,
    trigger,
  } = useForm<TFormValues>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: yupResolver(schema) as Resolver<TFormValues>,
  });
  const submitHandler = onValidSubmit ? handleSubmit(onValidSubmit) : onSubmit;

  return (
    <Box component="form" onSubmit={submitHandler} sx={authFormSx.card}>
      <Box sx={authFormSx.header}>
        <Typography component="h1" sx={authFormSx.title}>
          {content.title}
        </Typography>
        <Typography sx={authFormSx.subtitle}>{content.subtitle}</Typography>
      </Box>

      {showSocialLogin ? (
        <>
          <Box sx={authFormSx.stack}>
            <SocialConnectButton onClick={onGoogleConnect} provider="google" />
            <SocialConnectButton onClick={onLinkedInConnect} provider="linkedin" />
          </Box>

          <Box aria-hidden="true" sx={authFormSx.divider}>
            <span>or</span>
          </Box>
        </>
      ) : null}

      <Box sx={authFormSx.stack}>
        {fields.map((field) => {
          const fieldError = errors[field.name]?.message;
          const isPasswordField = PASSWORD_FIELDS.has(field.name);
          const isPhoneField = field.type === 'tel';
          const inputMode = isPhoneField ? 'tel' : undefined;
          const isVisible = Boolean(visibleFields[field.name]);
          const resolvedType = isPasswordField && isVisible ? 'text' : (field.type ?? 'text');
          const maxLength = FIELD_MAX_LENGTHS[field.name];

          return (
            <Input
              autoComplete={field.autoComplete}
              errorMessage={typeof fieldError === 'string' ? fieldError : undefined}
              fullWidth
              inputMode={inputMode}
              key={field.name}
              label={field.label}
              slotProps={{
                htmlInput: {
                  maxLength,
                },
              }}
              onBlur={() => {
                void trigger(field.name as Path<TFormValues>);
              }}
              onInput={
                isPhoneField
                  ? (event) => {
                      const input = event.target as HTMLInputElement;
                      input.value = sanitizePhoneNumber(input.value);
                    }
                  : undefined
              }
              placeholder={field.placeholder}
              startAdornment={renderIcon(field.startIcon)}
              type={resolvedType}
              endAdornment={
                isPasswordField ? (
                  <button
                    aria-label={isVisible ? `Hide ${field.label}` : `Show ${field.label}`}
                    onClick={(event) => {
                      event.preventDefault();
                      setVisibleFields((current) => ({
                        ...current,
                        [field.name]: !current[field.name],
                      }));
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      padding: 0,
                    }}
                    type="button"
                  >
                    {isVisible ? (
                      <VisibilityOutlinedIcon fontSize="small" />
                    ) : (
                      <VisibilityOffOutlinedIcon fontSize="small" />
                    )}
                  </button>
                ) : (
                  renderIcon(field.endIcon)
                )
              }
            />
          );
        })}

        {mode === 'login' ? (
          <Box sx={authFormSx.actions}>
            <FormControlLabel
              control={<Checkbox defaultChecked {...register('rememberMe' as Path<TFormValues>)} />}
              label="Remember me"
            />
            <Link href={forgotPasswordHref} onClick={onForgotPasswordClick} sx={authFormSx.link}>
              Forgot password?
            </Link>
          </Box>
        ) : null}

        <Button
          endIcon={<ArrowForwardIcon />}
          fullWidth
          isLoading={isSubmitting}
          size="extraLarge"
          type="submit"
        >
          {content.submitLabel}
        </Button>
      </Box>

      <Typography sx={authFormSx.footer}>
        {content.footerText}{' '}
        <Link href={alternateActionHref} onClick={onAlternateActionClick} sx={authFormSx.link}>
          {content.footerActionLabel}
        </Link>
      </Typography>
    </Box>
  );
}
