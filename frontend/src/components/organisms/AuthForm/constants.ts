import * as yup from 'yup';

import type { AuthFormContent, AuthFormField, AuthFormMode } from './interfaces';

export const AUTH_FORM_CONTENT: Record<AuthFormMode, AuthFormContent> = {
  login: {
    footerActionLabel: 'Create account',
    footerText: "Don't have an account?",
    submitLabel: 'Login',
    subtitle: 'Login to continue to your account',
    title: 'Welcome back!',
  },
  register: {
    footerActionLabel: 'Login',
    footerText: 'Already have an account?',
    submitLabel: 'Create account',
    subtitle: 'Create your CareerCopilot account',
    title: 'Create account',
  },
};

export const AUTH_FORM_FIELDS: Record<AuthFormMode, AuthFormField[]> = {
  login: [
    {
      autoComplete: 'email',
      label: 'Email address',
      name: 'email',
      placeholder: 'you@example.com',
      startIcon: 'email',
      type: 'email',
    },
    {
      autoComplete: 'current-password',
      endIcon: 'visibilityOff',
      label: 'Password',
      name: 'password',
      placeholder: 'Enter your password',
      startIcon: 'lock',
      type: 'password',
    },
  ],
  register: [
    {
      autoComplete: 'name',
      label: 'Full name',
      name: 'name',
      placeholder: 'John Doe',
      startIcon: 'person',
      type: 'text',
    },
    {
      autoComplete: 'email',
      label: 'Email address',
      name: 'email',
      placeholder: 'you@example.com',
      startIcon: 'email',
      type: 'email',
    },
    {
      autoComplete: 'new-password',
      endIcon: 'visibilityOff',
      label: 'Password',
      name: 'password',
      placeholder: 'Enter your password',
      startIcon: 'lock',
      type: 'password',
    },
    {
      autoComplete: 'new-password',
      endIcon: 'visibilityOff',
      label: 'Confirm password',
      name: 'confirmPassword',
      placeholder: 'Confirm your password',
      startIcon: 'lock',
      type: 'password',
    },
  ],
};

export const AUTH_FORM_VALIDATION_SCHEMAS = {
  login: yup.object({
    email: yup.string().email('Enter a valid email address').required('Email is required'),
    password: yup.string().required('Password is required'),
    rememberMe: yup.boolean().default(true),
  }),
  register: yup.object({
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password')], 'Passwords must match')
      .required('Confirm password is required'),
    email: yup.string().email('Enter a valid email address').required('Email is required'),
    name: yup.string().required('Full name is required'),
    password: yup
      .string()
      .min(8, 'Password must be at least 8 characters')
      .required('Password is required'),
  }),
} as const;
