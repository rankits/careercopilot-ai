import { yupResolver } from '@hookform/resolvers/yup';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';
import { useForm, type FieldValues, type Path, type Resolver } from 'react-hook-form';

import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';

import { SocialConnectButton } from '../SocialConnectButton';

import { AUTH_FORM_CONTENT, AUTH_FORM_FIELDS, AUTH_FORM_VALIDATION_SCHEMAS } from './constants';
import type { AuthFieldIcon, AuthFieldIconMap, AuthFormField, AuthFormProps } from './interfaces';
import { authFormSx } from './styles';

const fieldIcons: AuthFieldIconMap = {
  email: EmailOutlinedIcon,
  lock: LockOutlinedIcon,
  person: PersonOutlineIcon,
  visibilityOff: VisibilityOffOutlinedIcon,
};

function renderIcon(icon?: AuthFieldIcon) {
  if (!icon) {
    return undefined;
  }

  const Icon = fieldIcons[icon];

  return <Icon fontSize="small" />;
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
  const fields = useMemo<AuthFormField[]>(
    () => [...AUTH_FORM_FIELDS[mode], ...extraFields],
    [extraFields, mode],
  );
  const schema = validationSchema ?? AUTH_FORM_VALIDATION_SCHEMAS[mode];
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<TFormValues>({
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

          return (
            <Input
              autoComplete={field.autoComplete}
              errorMessage={typeof fieldError === 'string' ? fieldError : undefined}
              fullWidth
              key={field.name}
              label={field.label}
              placeholder={field.placeholder}
              startAdornment={renderIcon(field.startIcon)}
              type={field.type ?? 'text'}
              {...register(field.name as Path<TFormValues>)}
              endAdornment={renderIcon(field.endIcon)}
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
