import type { FormEventHandler } from 'react';
import type { FieldValues, SubmitHandler } from 'react-hook-form';
import type { AnyObjectSchema } from 'yup';

import type { SvgIconComponent } from '@/lib/material';

export type AuthFormMode = 'login' | 'register';
export type AuthFieldType = 'email' | 'password' | 'tel' | 'text';
export type AuthFieldIcon = 'email' | 'lock' | 'person' | 'phone' | 'visibilityOff';

export interface AuthFormContent {
  footerActionLabel: string;
  footerText: string;
  submitLabel: string;
  subtitle: string;
  title: string;
}

export interface AuthFormField {
  autoComplete?: string;
  endIcon?: AuthFieldIcon;
  label: string;
  maxLength?: number;
  name: string;
  placeholder?: string;
  startIcon?: AuthFieldIcon;
  type?: AuthFieldType;
}

export interface AuthFormProps<TFormValues extends FieldValues = FieldValues> {
  alternateActionHref?: string;
  extraFields?: AuthFormField[];
  forgotPasswordHref?: string;
  isSubmitting?: boolean;
  mode?: AuthFormMode;
  onAlternateActionClick?: () => void;
  onForgotPasswordClick?: () => void;
  onGoogleConnect?: () => void;
  onLinkedInConnect?: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  onValidSubmit?: SubmitHandler<TFormValues>;
  showSocialLogin?: boolean;
  validationSchema?: AnyObjectSchema;
}

export type AuthFieldIconMap = Record<AuthFieldIcon, SvgIconComponent>;
