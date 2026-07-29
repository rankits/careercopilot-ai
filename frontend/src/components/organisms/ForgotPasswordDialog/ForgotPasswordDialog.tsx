import { useState, type FormEvent } from 'react';

import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';

import forgotPasswordIllustrationUrl from '@/assets/illustrations/forgot-password-illustration-exact.svg';
import {
  ArrowForwardIcon,
  Box,
  CloseOutlinedIcon,
  Dialog,
  DialogContent,
  EmailOutlinedIcon,
  IconButton,
  Typography,
} from '@/lib/material';

import { forgotPasswordDialogSx } from './styles';

export interface ForgotPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSendResetLink?: (email: string) => void;
}

export function ForgotPasswordDialog({
  onClose,
  onSendResetLink,
  open,
}: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState('');

  function handleClose() {
    setEmail('');
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSendResetLink?.(email.trim());
    handleClose();
  }

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
    >
      <DialogContent sx={forgotPasswordDialogSx.dialogContent}>
        <IconButton
          aria-label="Close dialog"
          onClick={handleClose}
          sx={forgotPasswordDialogSx.closeButton}
        >
          <CloseOutlinedIcon />
        </IconButton>

        <Box sx={forgotPasswordDialogSx.contentStack}>
          <Box
            alt="Forgot password illustration"
            component="img"
            src={forgotPasswordIllustrationUrl}
            sx={forgotPasswordDialogSx.heroImage}
          />

          <Box sx={forgotPasswordDialogSx.contentStack}>
            <Typography
              component="h2"
              id="forgot-password-dialog-title"
              sx={forgotPasswordDialogSx.title}
            >
              Forgot Password?
            </Typography>
            <Typography
              component="p"
              id="forgot-password-dialog-description"
              sx={forgotPasswordDialogSx.subtitle}
            >
              No worries! Enter your email address and we’ll send you a password reset link.
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={forgotPasswordDialogSx.form}>
            <Input
              autoComplete="email"
              fullWidth
              label="Email Address"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              startAdornment={<EmailOutlinedIcon />}
              type="email"
              value={email}
            />

            <Button endIcon={<ArrowForwardIcon />} fullWidth size="extraLarge" type="submit">
              Send Reset Link
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
