import * as yup from 'yup';

import type { AuthFormContent, AuthFormField, AuthFormMode } from './interfaces';

export const AUTH_FIELD_LIMITS = {
  email: 300,
  name: 80,
  password: 128,
  phone: 10,
} as const;

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
      maxLength: AUTH_FIELD_LIMITS.email,
      name: 'email',
      placeholder: 'you@example.com',
      startIcon: 'email',
      type: 'email',
    },
    {
      autoComplete: 'current-password',
      endIcon: 'visibilityOff',
      label: 'Password',
      maxLength: AUTH_FIELD_LIMITS.password,
      name: 'password',
      placeholder: 'Enter your password',
      startIcon: 'lock',
      type: 'password',
    },
  ],
  register: [
    {
      autoComplete: 'given-name',
      label: 'First name',
      maxLength: AUTH_FIELD_LIMITS.name,
      name: 'firstName',
      placeholder: 'Jane',
      startIcon: 'person',
      type: 'text',
    },
    {
      autoComplete: 'family-name',
      label: 'Last name',
      maxLength: AUTH_FIELD_LIMITS.name,
      name: 'lastName',
      placeholder: 'Doe',
      startIcon: 'person',
      type: 'text',
    },
    {
      autoComplete: 'email',
      label: 'Email address',
      maxLength: AUTH_FIELD_LIMITS.email,
      name: 'email',
      placeholder: 'you@example.com',
      startIcon: 'email',
      type: 'email',
    },
    {
      autoComplete: 'tel',
      label: 'Phone number',
      maxLength: AUTH_FIELD_LIMITS.phone,
      name: 'phone',
      placeholder: '9876543210',
      startIcon: 'phone',
      type: 'tel',
    },
    {
      autoComplete: 'new-password',
      endIcon: 'visibilityOff',
      label: 'Password',
      maxLength: AUTH_FIELD_LIMITS.password,
      name: 'password',
      placeholder: 'Enter your password',
      startIcon: 'lock',
      type: 'password',
    },
    {
      autoComplete: 'new-password',
      endIcon: 'visibilityOff',
      label: 'Confirm password',
      maxLength: AUTH_FIELD_LIMITS.password,
      name: 'confirmPassword',
      placeholder: 'Confirm your password',
      startIcon: 'lock',
      type: 'password',
    },
  ],
};

export const AUTH_FORM_VALIDATION_SCHEMAS = {
  login: yup.object({
    email: yup
      .string()
      .max(AUTH_FIELD_LIMITS.email, 'Email address must be 300 characters or fewer')
      .email('Enter a valid email address')
      .required('Email is required'),
    password: yup
      .string()
      .required('Password is required')
      .min(8, 'Password must be at least 8 characters')
      .max(AUTH_FIELD_LIMITS.password, 'Password must be 128 characters or fewer'),
    rememberMe: yup.boolean().default(true),
  }),
  register: yup.object({
    confirmPassword: yup
      .string()
      .max(AUTH_FIELD_LIMITS.password, 'Confirm password must be 128 characters or fewer')
      .oneOf([yup.ref('password')], 'Passwords must match')
      .required('Confirm password is required'),
    email: yup
      .string()
      .max(AUTH_FIELD_LIMITS.email, 'Email address must be 300 characters or fewer')
      .email('Enter a valid email address')
      .required('Email is required'),
    firstName: yup
      .string()
      .trim()
      .max(AUTH_FIELD_LIMITS.name, 'First name must be 80 characters or fewer')
      .required('First name is required'),
    lastName: yup
      .string()
      .trim()
      .max(AUTH_FIELD_LIMITS.name, 'Last name must be 80 characters or fewer')
      .required('Last name is required'),
    password: yup
      .string()
      .required('Password is required')
      .min(8, 'Password must be at least 8 characters')
      .max(AUTH_FIELD_LIMITS.password, 'Password must be 128 characters or fewer')
      .matches(/[A-Z]/, 'Password must include an uppercase letter')
      .matches(/[a-z]/, 'Password must include a lowercase letter')
      .matches(/\d/, 'Password must include a number')
      .matches(/[^A-Za-z0-9]/, 'Password must include a symbol'),
    phone: yup
      .string()
      .required('Phone number is required')
      .length(AUTH_FIELD_LIMITS.phone, 'Phone number must be 10 digits')
      .matches(/^\d{10}$/, {
        excludeEmptyString: true,
        message: 'Enter a valid phone number',
      }),
  }),
} as const;
