import { useMemo, useState, type MouseEvent } from 'react';
import {
  Controller,
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type Resolver,
} from 'react-hook-form';

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
import {
  composePhoneWithDialCode,
  getDefaultCountryDialCode,
  NATIONAL_PHONE_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  sanitizeNationalPhoneInput,
  sanitizePhoneInput,
  type CountryDialCode,
} from '@/utils/phone';

import { SocialConnectButton } from '../SocialConnectButton';

import { CountryDialCodeSelect } from './CountryDialCodeSelect';
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
  phone: PHONE_MAX_LENGTH,
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
  const [countryDialCode, setCountryDialCode] =
    useState<CountryDialCode>(getDefaultCountryDialCode);
  const fields = useMemo<AuthFormField[]>(
    () => [...AUTH_FORM_FIELDS[mode], ...extraFields],
    [extraFields, mode],
  );
  const schema = validationSchema ?? AUTH_FORM_VALIDATION_SCHEMAS[mode];
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    trigger,
  } = useForm<TFormValues>({
    defaultValues: (mode === 'login' ? { rememberMe: true } : undefined) as
      DefaultValues<TFormValues> | undefined,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: yupResolver(schema) as Resolver<TFormValues>,
  });

  const submitHandler = onValidSubmit
    ? handleSubmit((values) => {
        if (mode === 'register' && 'phone' in values) {
          const national = sanitizeNationalPhoneInput(String(values.phone ?? ''));
          return onValidSubmit({
            ...values,
            phone: composePhoneWithDialCode(countryDialCode, national),
          });
        }
        return onValidSubmit(values);
      })
    : onSubmit;

  const handleNavClick = (handler?: () => void) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    handler?.();
  };

  return (
    <Box
      autoComplete="on"
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
        {content.subtitle ? (
          <Typography sx={authFormSx.subtitle}>{content.subtitle}</Typography>
        ) : null}
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
            <SocialConnectButton comingSoon disabled onClick={onGoogleConnect} provider="google" />
            <SocialConnectButton
              comingSoon
              disabled
              onClick={onLinkedInConnect}
              provider="linkedin"
            />
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
          const isRegisterPhone = mode === 'register' && isPhoneField;
          const inputMode = isPhoneField ? 'tel' : undefined;
          const isVisible = Boolean(visibleFields[field.name]);
          const resolvedType = isPasswordField && isVisible ? 'text' : (field.type ?? 'text');
          const maxLength = isRegisterPhone
            ? NATIONAL_PHONE_MAX_LENGTH
            : (FIELD_MAX_LENGTHS[field.name] ?? field.maxLength);
          const registration = register(field.name as Path<TFormValues>);
          const fullWidthPasswordField =
            mode === 'register' && (field.name === 'password' || field.name === 'confirmPassword');

          const input = (
            <Input
              autoComplete={field.autoComplete}
              errorMessage={typeof fieldError === 'string' ? fieldError : undefined}
              fullWidth
              inputMode={inputMode}
              key={field.name}
              label={field.label}
              name={registration.name}
              onBlur={(e) => {
                void registration.onBlur(e);
                void trigger(field.name as Path<TFormValues>);
              }}
              onChange={(event) => {
                void registration.onChange(event);
              }}
              onInput={
                isPhoneField || field.maxLength
                  ? (event) => {
                      const inputEl = event.target as HTMLInputElement;
                      const sanitizedValue = isRegisterPhone
                        ? sanitizeNationalPhoneInput(inputEl.value)
                        : isPhoneField
                          ? sanitizePhoneInput(inputEl.value)
                          : inputEl.value;

                      inputEl.value = limitFieldValue(sanitizedValue, maxLength);
                    }
                  : undefined
              }
              placeholder={field.placeholder}
              ref={registration.ref}
              size="medium"
              slotProps={{
                htmlInput: {
                  autoComplete: field.autoComplete,
                  maxLength,
                  name: field.name,
                },
              }}
              stabilizeHelper
              startAdornment={isRegisterPhone ? undefined : renderIcon(field.startIcon)}
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

          if (isRegisterPhone) {
            return (
              <Box key={field.name} sx={authFormSx.phoneRow}>
                <CountryDialCodeSelect onChange={setCountryDialCode} value={countryDialCode} />
                {input}
              </Box>
            );
          }

          if (fullWidthPasswordField) {
            return (
              <Box key={field.name} sx={{ gridColumn: '1 / -1', width: '100%' }}>
                {input}
              </Box>
            );
          }

          return input;
        })}

        {mode === 'login' ? (
          <Box sx={authFormSx.actions}>
            <FormControlLabel
              control={
                <Controller
                  control={control}
                  name={'rememberMe' as Path<TFormValues>}
                  render={({ field }) => (
                    <Checkbox
                      checked={Boolean(field.value)}
                      inputRef={field.ref}
                      onBlur={field.onBlur}
                      onChange={(_event, checked) => field.onChange(checked)}
                    />
                  )}
                />
              }
              label={AUTH_FORM_STATIC_COPY.rememberMeLabel}
            />
            <Link
              href={forgotPasswordHref}
              onClick={handleNavClick(onForgotPasswordClick)}
              sx={authFormSx.link}
            >
              {AUTH_FORM_STATIC_COPY.forgotPasswordLabel}
            </Link>
          </Box>
        ) : null}

        <Button
          endIcon={<ArrowForwardIcon />}
          fullWidth
          isLoading={isSubmitting}
          size={mode === 'register' ? 'large' : 'extraLarge'}
          sx={{ gridColumn: '1 / -1', boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
          type="submit"
        >
          {content.submitLabel}
        </Button>
      </Box>

      <Typography sx={authFormSx.footer}>
        {content.footerText}{' '}
        <Link
          href={alternateActionHref}
          onClick={handleNavClick(onAlternateActionClick)}
          sx={authFormSx.link}
        >
          {content.footerActionLabel}
        </Link>
      </Typography>
    </Box>
  );
}
