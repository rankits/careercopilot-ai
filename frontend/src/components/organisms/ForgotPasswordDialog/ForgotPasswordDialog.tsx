import { useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';

import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';

import penguinEmailIllustrationUrl from '@/assets/illustrations/penguin_email.svg';
import penguinKeyIllustrationUrl from '@/assets/illustrations/penguin_key.svg';
import penguinOtpIllustrationUrl from '@/assets/illustrations/penguin_otp.svg';
import {
  ArrowForwardIcon,
  CheckIcon,
  ChevronLeftIcon,
  Box,
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
  onSendResetLink?: (email: string) => void;
}

type ForgotPasswordStep = 1 | 2 | 3;

type ForgotPasswordFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

const steps = ['Email', 'OTP', 'New Password'] as const;

export function ForgotPasswordDialog({
  onClose,
  onSendResetLink,
  open,
}: ForgotPasswordDialogProps) {
  const [step, setStep] = useState<ForgotPasswordStep>(1);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const {
    formState: { errors },
    register,
    watch,
    trigger,
    reset,
  } = useForm<ForgotPasswordFormValues>({
    resolver: yupResolver(
      AUTH_FORM_VALIDATION_SCHEMAS.forgotPassword,
    ) as Resolver<ForgotPasswordFormValues>,
  });
  const email = watch('email', '');
  const password = watch('password', '');
  const confirmPassword = watch('confirmPassword', '');
  const emailError = errors.email?.message;
  const passwordError = errors.password?.message;
  const confirmPasswordError = errors.confirmPassword?.message;

  // useEffect(() => {
  //   if (open) otpRefs.current[0]?.focus();
  // }, [open, step]);
  useEffect(() => {
    if (open && step === 2) {
      requestAnimationFrame(() => {
        otpRefs.current[0]?.focus();
      });
    }
  }, [open, step]);

  function handleClose() {
    setStep(1);
    setOtp(['', '', '', '', '', '']);
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  }

  const submitHandler = async () => {
    if (step === 1) {
      const isValid = await trigger('email');
      if (!isValid) return;
      onSendResetLink?.(email);
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    const isValid = await trigger(['password', 'confirmPassword']);
    if (!isValid) return;
    reset({
      email: '',
      password: '',
      confirmPassword: '',
    });
    handleClose();
  };

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);

    setOtp((prev) => {
      const updated = [...prev];
      updated[index] = digit;
      return updated;
    });

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

  const passwordStrength = password.length >= 10 ? 'Strong' : password.length >= 6 ? 'Medium' : '';
  const isStepComplete =
    step === 1
      ? email.trim().length > 0
      : step === 2
        ? otp.every(Boolean)
        : password.length >= 8 && password === confirmPassword;
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
      onClose={handleClose}
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
          onClick={handleClose}
          sx={forgotPasswordDialogSx.closeButton}
        >
          <CloseOutlinedIcon />
        </IconButton>

        <Box sx={forgotPasswordDialogSx.stepper}>
          {steps.map((label, index) => {
            const stepNumber = (index + 1) as ForgotPasswordStep;
            const complete = stepNumber < step;
            return (
              <Box
                alignItems="center"
                display="flex"
                key={label}
                sx={forgotPasswordDialogSx.stepItem}
              >
                <Box sx={forgotPasswordDialogSx.stepCircle(stepNumber === step || complete)}>
                  {complete ? <CheckIcon fontSize="small" /> : stepNumber}
                </Box>
                <Typography sx={forgotPasswordDialogSx.stepLabel(stepNumber === step)}>
                  {label}
                </Typography>
                {index < steps.length - 1 ? <Box sx={forgotPasswordDialogSx.stepLine} /> : null}
              </Box>
            );
          })}
        </Box>

        <Box sx={forgotPasswordDialogSx.mainContent}>
          <Box
            alt="Forgot password illustration"
            component="img"
            src={illustrationUrl}
            sx={forgotPasswordDialogSx.heroImage}
          />

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
                  fullWidth
                  label="Email Address"
                  placeholder="you@example.com"
                  startAdornment={<EmailOutlinedIcon />}
                  type="text"
                  errorMessage={typeof emailError === 'string' ? emailError : undefined}
                  {...register('email')}
                  sx={{
                    mt: 2,
                    '& .MuiInputBase-input': {
                      fontSize: {
                        xs: '18px',
                        sm: '18px',
                        md: '18px',
                      },
                    },
                    '& .MuiInputBase-input::placeholder': {
                      fontSize: {
                        xs: '18px',
                        sm: '18px',
                        md: '18px',
                      },
                      opacity: 1,
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: {
                        xs: '15px',
                        sm: '15px',
                        md: '15px',
                      },
                    },
                    '& .MuiInputLabel-root.MuiInputLabel-shrink': {
                      transform: {
                        xs: 'translate(12px, -10px) scale(0.75)',
                        sm: 'translate(14px, -12px) scale(0.75)',
                      },
                      fontSize: {
                        xs: '18px',
                        sm: '18px',
                        md: '20px',
                      },
                      top: '2px',
                      padding: '0 6px',
                      backgroundColor: '#fff',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#D0D5DD',
                    },
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '1px',
                    },
                  }}
                />
              ) : null}

              {step === 2 ? (
                <>
                  <Box
                    aria-label="One-time password"
                    display="grid"
                    gridTemplateColumns="repeat(6, 1fr)"
                    gap={1}
                  >
                    {otp.map((value, index) => (
                      <Input
                        key={index}
                        ref={(element: HTMLInputElement | null) => {
                          otpRefs.current[index] = element;
                        }}
                        autoFocus={index === 0}
                        inputProps={{ maxLength: 1 }}
                        onChange={(event) => handleOtpChange(index, event.target.value)}
                        onKeyDown={(event) => handleOtpKeyDown(index, event.key)}
                        sx={forgotPasswordDialogSx.otpInput}
                        value={value}
                      />
                    ))}
                  </Box>
                  <Box sx={forgotPasswordDialogSx.resendRow}>
                    <Typography sx={forgotPasswordDialogSx.resendText}>
                      Didn&apos;t receive the code?
                    </Typography>

                    <Typography sx={forgotPasswordDialogSx.resendLink}>
                      Resend OTP in 00:28
                    </Typography>
                  </Box>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <Input
                    autoComplete="new-password"
                    endAdornment={
                      <IconButton
                        aria-label="Show password"
                        onClick={() => setShowPassword((current) => !current)}
                      >
                        <VisibilityOffOutlinedIcon />
                      </IconButton>
                    }
                    fullWidth
                    label="New Password"
                    startAdornment={<LockOutlinedIcon />}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    errorMessage={typeof passwordError === 'string' ? passwordError : undefined}
                    {...register('password')}
                    sx={{
                      '& .MuiInputBase-input': {
                        fontSize: '18px',
                      },
                      '& .MuiInputBase-input::placeholder': {
                        fontSize: '18px',
                        opacity: 1,
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '15px',
                      },
                      '& .MuiInputLabel-root.MuiInputLabel-shrink': {
                        transform: 'translate(14px, -12px) scale(0.75)',
                        fontSize: '20px',
                        top: '0px',
                        padding: '0 6px',
                        backgroundColor: '#fff',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#D0D5DD',
                      },
                      '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderWidth: '1px',
                      },
                    }}
                  />
                  <Box sx={forgotPasswordDialogSx.strengthRow}>
                    <Box sx={forgotPasswordDialogSx.strengthBar(passwordStrength)} />
                    <Typography
                      color={passwordStrength === 'Strong' ? 'success.main' : 'text.secondary'}
                      variant="caption"
                    >
                      {passwordStrength}
                    </Typography>
                  </Box>
                  <Input
                    autoComplete="new-password"
                    endAdornment={
                      <IconButton
                        aria-label="Show confirm password"
                        onClick={() => setShowConfirmPassword((current) => !current)}
                      >
                        <VisibilityOffOutlinedIcon />
                      </IconButton>
                    }
                    fullWidth
                    label="Confirm New Password"
                    startAdornment={<LockOutlinedIcon />}
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    errorMessage={
                      typeof confirmPasswordError === 'string' ? confirmPasswordError : undefined
                    }
                    {...register('confirmPassword')}
                    sx={{
                      '& .MuiInputBase-input': {
                        fontSize: '18px',
                      },
                      '& .MuiInputBase-input::placeholder': {
                        fontSize: '18px',
                        opacity: 1,
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '15px',
                      },
                      '& .MuiInputLabel-root.MuiInputLabel-shrink': {
                        transform: 'translate(14px, -12px) scale(0.75)',
                        fontSize: '20px',
                        top: '0px',
                        padding: '0 6px',
                        backgroundColor: '#fff',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#D0D5DD',
                      },
                      '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderWidth: '1px',
                      },
                    }}
                  />
                </>
              ) : null}
            </Box>
          </Box>
        </Box>

        <Box sx={forgotPasswordDialogSx.actionRow}>
          <Button
            onClick={() =>
              step === 1 ? handleClose() : setStep((current) => (current - 1) as ForgotPasswordStep)
            }
            startIcon={<ChevronLeftIcon />}
            sx={forgotPasswordDialogSx.backButton}
            type="button"
            variant="ghost"
          >
            {step === 1 ? 'Back to Login' : 'Back'}
          </Button>
          <Button
            disabled={!isStepComplete}
            endIcon={<ArrowForwardIcon />}
            form="forgot-password-form"
            size="extraLarge"
            sx={forgotPasswordDialogSx.primaryButton}
            type="submit"
          >
            {step === 1 ? 'Send Reset Link' : step === 2 ? 'Verify OTP' : 'Update Password'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
