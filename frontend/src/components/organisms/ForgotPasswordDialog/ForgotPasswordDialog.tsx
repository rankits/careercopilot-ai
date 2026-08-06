import { useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';

import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useForgotPassword } from '@/features/auth/hooks/useForgotPassword';

import penguinEmailIllustrationUrl from '@/assets/illustrations/penguin-email.svg';
import penguinKeyIllustrationUrl from '@/assets/illustrations/penguin-key.svg';
import penguinOtpIllustrationUrl from '@/assets/illustrations/penguin-otp.svg';
import {
  ArrowForwardIcon,
  Box,
  CheckIcon,
  ChevronLeftIcon,
  CloseOutlinedIcon,
  Dialog,
  DialogContent,
  EmailOutlinedIcon,
  IconButton,
  LockOutlinedIcon,
  Typography,
  VisibilityOffOutlinedIcon,
  yupResolver,
} from '@/lib/material';

import { AUTH_FORM_VALIDATION_SCHEMAS } from '../AuthForm/constants';

import { forgotPasswordDialogSx } from './styles';

export interface ForgotPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onPasswordResetSuccess?: (message: string) => void;
}

type ForgotPasswordStep = 1 | 2 | 3;

type ForgotPasswordFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

const steps = [
  { full: 'Email', short: 'Email' },
  { full: 'OTP', short: 'OTP' },
  { full: 'New Password', short: 'Password' },
] as const;
const RESEND_COOLDOWN_SECONDS = 60;

function formatCountdown(seconds: number) {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function ForgotPasswordDialog({
  onClose,
  onPasswordResetSuccess,
  open,
}: ForgotPasswordDialogProps) {
  const { showToast } = useToast();
  const { isRequestingReset, isResettingPassword, requestReset, resetPassword } =
    useForgotPassword();
  const [step, setStep] = useState<ForgotPasswordStep>(1);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | undefined>();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const {
    formState: { errors },
    register,
    watch,
    trigger,
    reset,
    clearErrors,
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      confirmPassword: '',
      email: '',
      password: '',
    },
    // No errors on open; validate on submit / after first attempt.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: yupResolver(
      AUTH_FORM_VALIDATION_SCHEMAS.forgotPassword,
    ) as Resolver<ForgotPasswordFormValues>,
  });
  const email = watch('email', '');
  const password = watch('password', '');
  const emailError = typeof errors.email?.message === 'string' ? errors.email.message : undefined;
  const passwordError =
    typeof errors.password?.message === 'string' ? errors.password.message : undefined;
  const confirmPasswordError =
    typeof errors.confirmPassword?.message === 'string'
      ? errors.confirmPassword.message
      : undefined;
  const otpCode = otp.join('');
  const isBusy = isRequestingReset || isResettingPassword;

  function validateOtpCode(code: string): string | undefined {
    if (!code) {
      return 'Verification code is required';
    }
    if (!/^\d+$/.test(code)) {
      return 'Code must be numeric';
    }
    if (code.length !== 6) {
      return 'Enter the 6-digit verification code';
    }
    return undefined;
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    clearErrors();
  }, [clearErrors, open]);

  useEffect(() => {
    if (open && step === 2) {
      requestAnimationFrame(() => {
        otpRefs.current[0]?.focus();
      });
    }
  }, [open, step]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  function startResendCooldown() {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }

  function handleClose() {
    setStep(1);
    setOtp(['', '', '', '', '', '']);
    setOtpError(undefined);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setResendCooldown(0);
    reset({
      email: '',
      password: '',
      confirmPassword: '',
    });
    clearErrors();
    onClose();
  }

  async function handleSendOrResendCode() {
    const result = await requestReset(email);

    if (!result.succeeded) {
      showToast({
        message: result.errorMessage ?? 'Unable to send reset code. Please try again.',
        severity: 'error',
      });
      return false;
    }

    startResendCooldown();
    return true;
  }

  const submitHandler = async () => {
    if (isBusy) {
      return;
    }

    if (step === 1) {
      const isValid = await trigger('email');
      if (!isValid) return;

      // Advance only after forgot-password returns success.
      const sent = await handleSendOrResendCode();
      if (!sent) {
        return;
      }

      setStep(2);
      return;
    }

    if (step === 2) {
      // OTP is verified by reset-password on the final step; only format-check here.
      const nextOtpError = validateOtpCode(otpCode);
      setOtpError(nextOtpError);
      if (nextOtpError) return;
      setStep(3);
      return;
    }

    const isValid = await trigger(['password', 'confirmPassword']);
    if (!isValid) return;

    // Close only after reset-password returns success.
    const result = await resetPassword({
      code: otpCode,
      email,
      newPassword: password,
    });

    if (!result.succeeded) {
      showToast({
        message: result.errorMessage ?? 'Unable to reset password. Please try again.',
        severity: 'error',
      });
      return;
    }

    const successMessage =
      result.message ?? 'Password has been reset. Please sign in with your new password.';
    onPasswordResetSuccess?.(successMessage);
    handleClose();
  };

  async function handleResendOtp() {
    if (isBusy || resendCooldown > 0) {
      return;
    }

    const isValid = await trigger('email');
    if (!isValid) return;

    const sent = await handleSendOrResendCode();
    if (!sent) return;

    showToast({
      message: 'If an account with that email exists, a verification code has been sent.',
      severity: 'success',
    });
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);

    setOtp((prev) => {
      const updated = [...prev];
      updated[index] = digit;
      return updated;
    });
    setOtpError(undefined);

    if (digit && index < otp.length - 1) {
      setTimeout(() => {
        otpRefs.current[index + 1]?.focus();
      }, 0);
    }
  }

  function handleOtpKeyDown(index: number, key: string) {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      setTimeout(() => {
        otpRefs.current[index - 1]?.focus();
      }, 0);
    }
  }

  const meetsPasswordPolicy =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
  const passwordStrength = meetsPasswordPolicy
    ? password.length >= 12
      ? 'Strong'
      : 'Medium'
    : password.length > 0
      ? 'Weak'
      : '';

  const illustrationUrl =
    step === 1
      ? penguinEmailIllustrationUrl
      : step === 2
        ? penguinOtpIllustrationUrl
        : penguinKeyIllustrationUrl;

  return (
    <Dialog
      aria-describedby="forgot-password-dialog-description"
      aria-labelledby="forgot-password-dialog-title"
      fullWidth
      onClose={isBusy ? undefined : handleClose}
      open={open}
      slotProps={{
        backdrop: {
          sx: forgotPasswordDialogSx.backdrop,
        },
        paper: {
          sx: forgotPasswordDialogSx.paper,
        },
      }}
      sx={forgotPasswordDialogSx.root}
    >
      <DialogContent sx={forgotPasswordDialogSx.dialogContent}>
        <IconButton
          aria-label="Close dialog"
          disabled={isBusy}
          onClick={handleClose}
          sx={forgotPasswordDialogSx.closeButton}
        >
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>

        <Box sx={forgotPasswordDialogSx.stepper}>
          {steps.map((label, index) => {
            const stepNumber = (index + 1) as ForgotPasswordStep;
            const complete = stepNumber < step;
            return (
              <Box
                alignItems="center"
                display="flex"
                key={label.full}
                sx={forgotPasswordDialogSx.stepItem}
              >
                <Box sx={forgotPasswordDialogSx.stepCircle(stepNumber === step || complete)}>
                  {complete ? <CheckIcon fontSize="small" /> : stepNumber}
                </Box>
                <Typography sx={forgotPasswordDialogSx.stepLabel(stepNumber === step)}>
                  <Box component="span" sx={forgotPasswordDialogSx.stepLabelFull}>
                    {label.full}
                  </Box>
                  <Box component="span" sx={forgotPasswordDialogSx.stepLabelShort}>
                    {label.short}
                  </Box>
                </Typography>
                {index < steps.length - 1 ? <Box sx={forgotPasswordDialogSx.stepLine} /> : null}
              </Box>
            );
          })}
        </Box>

        <Box sx={forgotPasswordDialogSx.mainContent}>
          <Box sx={forgotPasswordDialogSx.heroImageWrapper}>
            <Box
              alt="Forgot password illustration"
              component="img"
              src={illustrationUrl}
              sx={forgotPasswordDialogSx.heroImage}
            />
          </Box>

          <Box sx={forgotPasswordDialogSx.formContent}>
            <Typography
              component="h2"
              id="forgot-password-dialog-title"
              sx={forgotPasswordDialogSx.title}
            >
              {step === 1
                ? 'Forgot Password?'
                : step === 2
                  ? 'Verify Your Email'
                  : 'Create New Password'}
            </Typography>
            <Typography
              component="p"
              id="forgot-password-dialog-description"
              sx={forgotPasswordDialogSx.subtitle}
            >
              {step === 1 ? (
                'No worries! Enter your email address and we’ll send you a password reset link.'
              ) : step === 2 ? (
                <>
                  Enter the 6-digit code sent to <strong>{email || 'you@example.com'}</strong>
                </>
              ) : (
                'Choose a strong password to secure your account.'
              )}
            </Typography>
            <Box
              component="form"
              id="forgot-password-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submitHandler();
              }}
              sx={forgotPasswordDialogSx.form}
            >
              {step === 1 ? (
                <Input
                  autoComplete="email"
                  autoFocus
                  errorMessage={emailError}
                  fullWidth
                  label="Email Address"
                  placeholder="you@example.com"
                  size="medium"
                  startAdornment={<EmailOutlinedIcon />}
                  type="email"
                  {...register('email')}
                />
              ) : null}

              {step === 2 ? (
                <>
                  <Box aria-label="One-time password" sx={forgotPasswordDialogSx.otpGrid}>
                    {otp.map((value, index) => (
                      <Input
                        key={index}
                        ref={(element: HTMLInputElement | null) => {
                          otpRefs.current[index] = element;
                        }}
                        aria-invalid={Boolean(otpError)}
                        autoComplete="one-time-code"
                        autoFocus={index === 0}
                        inputMode="numeric"
                        onChange={(event) => handleOtpChange(index, event.target.value)}
                        onKeyDown={(event) => handleOtpKeyDown(index, event.key)}
                        size="small"
                        slotProps={{
                          htmlInput: {
                            maxLength: 1,
                            pattern: '[0-9]*',
                          },
                        }}
                        sx={forgotPasswordDialogSx.otpInput(Boolean(otpError))}
                        tone={otpError ? 'error' : 'default'}
                        type="tel"
                        value={value}
                      />
                    ))}
                  </Box>
                  {otpError ? (
                    <Typography role="alert" sx={forgotPasswordDialogSx.otpError}>
                      {otpError}
                    </Typography>
                  ) : null}
                  <Box sx={forgotPasswordDialogSx.resendRow}>
                    <Typography sx={forgotPasswordDialogSx.resendText}>
                      Didn&apos;t receive the code?
                    </Typography>
                    {resendCooldown > 0 ? (
                      <Typography sx={forgotPasswordDialogSx.resendText}>
                        Resend OTP in {formatCountdown(resendCooldown)}
                      </Typography>
                    ) : (
                      <Typography
                        component="button"
                        disabled={isBusy}
                        onClick={() => void handleResendOtp()}
                        sx={forgotPasswordDialogSx.resendLink}
                        type="button"
                      >
                        {isRequestingReset ? 'Sending…' : 'Resend OTP'}
                      </Typography>
                    )}
                  </Box>
                </>
              ) : null}

              {step === 3 ? (
                <Box sx={forgotPasswordDialogSx.passwordFields}>
                  <Box sx={forgotPasswordDialogSx.passwordFieldGroup}>
                    <Input
                      autoComplete="new-password"
                      endAdornment={
                        <IconButton
                          aria-label="Show password"
                          edge="end"
                          onClick={() => setShowPassword((current) => !current)}
                          size="small"
                        >
                          <VisibilityOffOutlinedIcon fontSize="small" />
                        </IconButton>
                      }
                      errorMessage={passwordError}
                      fullWidth
                      helperText={
                        passwordError
                          ? undefined
                          : 'Use 8+ characters with upper, lower, number, and symbol'
                      }
                      label="New Password"
                      size="medium"
                      slotProps={{
                        htmlInput: {
                          maxLength: 128,
                        },
                      }}
                      startAdornment={<LockOutlinedIcon />}
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                    />
                    {passwordStrength ? (
                      <Box sx={forgotPasswordDialogSx.strengthRow}>
                        <Box sx={forgotPasswordDialogSx.strengthBar(passwordStrength)} />
                        <Typography
                          color={
                            passwordStrength === 'Strong'
                              ? 'success.main'
                              : passwordStrength === 'Weak'
                                ? 'error.main'
                                : 'text.secondary'
                          }
                          variant="caption"
                        >
                          {passwordStrength}
                        </Typography>
                      </Box>
                    ) : null}
                  </Box>
                  <Input
                    autoComplete="new-password"
                    endAdornment={
                      <IconButton
                        aria-label="Show confirm password"
                        edge="end"
                        onClick={() => setShowConfirmPassword((current) => !current)}
                        size="small"
                      >
                        <VisibilityOffOutlinedIcon fontSize="small" />
                      </IconButton>
                    }
                    errorMessage={confirmPasswordError}
                    fullWidth
                    label="Confirm New Password"
                    size="medium"
                    slotProps={{
                      htmlInput: {
                        maxLength: 128,
                      },
                    }}
                    startAdornment={<LockOutlinedIcon />}
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword')}
                  />
                </Box>
              ) : null}
            </Box>
          </Box>
        </Box>

        <Box sx={forgotPasswordDialogSx.actionRow}>
          <Button
            disabled={isBusy}
            onClick={() => {
              if (step === 1) {
                handleClose();
                return;
              }
              if (step === 2) {
                setOtpError(undefined);
              }
              setStep((current) => (current - 1) as ForgotPasswordStep);
            }}
            startIcon={<ChevronLeftIcon />}
            sx={forgotPasswordDialogSx.backButton}
            type="button"
            variant="ghost"
          >
            {step === 1 ? 'Back to Login' : 'Back'}
          </Button>
          <Button
            disabled={isBusy}
            endIcon={<ArrowForwardIcon />}
            form="forgot-password-form"
            isLoading={isBusy && (step === 1 || step === 3)}
            size="large"
            sx={forgotPasswordDialogSx.primaryButton}
            type="submit"
          >
            {step === 1
              ? isRequestingReset
                ? 'Sending…'
                : 'Send Reset Link'
              : step === 2
                ? 'Verify OTP'
                : isResettingPassword
                  ? 'Updating…'
                  : 'Update Password'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
