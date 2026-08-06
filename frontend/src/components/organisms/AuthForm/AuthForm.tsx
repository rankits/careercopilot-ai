import { useMemo, useState } from 'react';
import { useForm, type FieldValues, type Path, type Resolver } from 'react-hook-form';

import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';

import {
  AUTH_FORM_ARIA,
  AUTH_FORM_CONTENT,
  AUTH_FORM_FIELDS,
  AUTH_FORM_STATIC_COPY,
  AUTH_FORM_VALIDATION_SCHEMAS,
} from '@/constants/ui';
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

function renderIcon(icon?: AuthFieldIcon) {
  if (!icon) {
    return undefined;
  }

  const Icon = fieldIcons[icon];

  return <Icon fontSize="small" />;
}

function sanitizePhoneNumber(value: string) {
  return value.replace(/\D/g, '');
}

function limitFieldValue(value: string, maxLength?: number) {
  return typeof maxLength === 'number' ? value.slice(0, maxLength) : value;
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
    <Box
      component="form"
      onSubmit={submitHandler}
      sx={mode === 'register' ? [authFormSx.card, authFormSx.registerCard] : authFormSx.card}
    >
      <Box
        sx={
          mode === 'register' ? [authFormSx.header, authFormSx.registerHeader] : authFormSx.header
        }
      >
        <Typography component="h1" sx={authFormSx.title}>
          {content.title}
        </Typography>
        <Typography sx={authFormSx.subtitle}>{content.subtitle}</Typography>
      </Box>

      {showSocialLogin ? (
        <>
          <Box
            sx={
              mode === 'register'
                ? [authFormSx.stack, authFormSx.registerSocialStack]
                : authFormSx.stack
            }
          >
            <SocialConnectButton onClick={onGoogleConnect} provider="google" />
            <SocialConnectButton onClick={onLinkedInConnect} provider="linkedin" />
          </Box>

          <Box aria-hidden="true" sx={authFormSx.divider}>
            <span>{AUTH_FORM_STATIC_COPY.dividerLabel}</span>
          </Box>
        </>
      ) : null}

      <Box
        sx={mode === 'register' ? [authFormSx.stack, authFormSx.registerFields] : authFormSx.stack}
      >
        {fields.map((field) => {
          const fieldError = errors[field.name]?.message;
          const isPasswordField = PASSWORD_FIELDS.has(field.name);
          const isPhoneField = field.type === 'tel';
          const inputMode = isPhoneField ? 'tel' : undefined;
          const isVisible = Boolean(visibleFields[field.name]);
          const resolvedType = isPasswordField && isVisible ? 'text' : (field.type ?? 'text');
          const registeredField = register(field.name as Path<TFormValues>);

          return (
            <Input
              autoComplete={field.autoComplete}
              errorMessage={typeof fieldError === 'string' ? fieldError : undefined}
              fullWidth
              inputMode={inputMode}
              key={field.name}
              label={field.label}
              {...registeredField}
              onBlur={(event) => {
                void registeredField.onBlur(event);
                void trigger(field.name as Path<TFormValues>);
              }}
              onInput={
                isPhoneField || field.maxLength
                  ? (event) => {
                      const input = event.target as HTMLInputElement;
                      const sanitizedValue = isPhoneField
                        ? sanitizePhoneNumber(input.value)
                        : input.value;

                      input.value = limitFieldValue(sanitizedValue, field.maxLength);
                    }
                  : undefined
              }
              placeholder={field.placeholder}
              size={mode === 'register' ? 'small' : 'medium'}
              slotProps={
                field.maxLength ? { htmlInput: { maxLength: field.maxLength } } : undefined
              }
              startAdornment={renderIcon(field.startIcon)}
              type={resolvedType}
              endAdornment={
                isPasswordField ? (
                  <button
                    aria-label={AUTH_FORM_ARIA.visibilityToggle(isVisible, field.label)}
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
              label={AUTH_FORM_STATIC_COPY.rememberMeLabel}
            />
            <Link href={forgotPasswordHref} onClick={onForgotPasswordClick} sx={authFormSx.link}>
              {AUTH_FORM_STATIC_COPY.forgotPasswordLabel}
            </Link>
          </Box>
        ) : null}

        <Button
          endIcon={<ArrowForwardIcon />}
          fullWidth
          isLoading={isSubmitting}
          size={mode === 'register' ? 'large' : 'extraLarge'}
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
