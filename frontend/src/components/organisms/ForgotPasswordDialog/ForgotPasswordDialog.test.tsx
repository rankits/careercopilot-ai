import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { ForgotPasswordDialog } from './ForgotPasswordDialog';

const { forgotPasswordMock, resetPasswordMock } = vi.hoisted(() => ({
  forgotPasswordMock: vi.fn(),
  resetPasswordMock: vi.fn(),
}));

vi.mock('@/features/auth/services/auth.service', () => ({
  authService: {
    forgotPassword: forgotPasswordMock,
    resetPassword: resetPasswordMock,
  },
}));

function renderDialog(
  props: Partial<ComponentProps<typeof ForgotPasswordDialog>> & {
    onClose?: () => void;
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const onClose = props.onClose ?? vi.fn();

  return {
    onClose,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ForgotPasswordDialog onClose={onClose} open {...props} />
        </ToastProvider>
      </QueryClientProvider>,
    ),
  };
}

describe('ForgotPasswordDialog', () => {
  beforeEach(() => {
    forgotPasswordMock.mockReset();
    resetPasswordMock.mockReset();
    forgotPasswordMock.mockResolvedValue({
      message: 'If an account with that email exists, a verification code has been sent.',
      status: 'success',
    });
    resetPasswordMock.mockResolvedValue({
      message: 'Password has been reset. Please sign in with your new password.',
      status: 'success',
    });
  });

  it('renders step 1 and sends a reset code before advancing to OTP', async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.getByRole('heading', { name: /forgot password\?/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();

    const sendButton = screen.getByRole('button', { name: /send reset link/i });
    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.click(sendButton);

    await waitFor(() =>
      expect(forgotPasswordMock).toHaveBeenCalledWith({ email: 'user@example.com' }),
    );
    expect(await screen.findByRole('heading', { name: /verify your email/i })).toBeInTheDocument();
  });

  it('stays on step 1 when forgot-password fails', async () => {
    forgotPasswordMock.mockRejectedValueOnce(
      new Error('Unable to send reset code. Please try again.'),
    );
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => expect(forgotPasswordMock).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: /forgot password\?/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /verify your email/i })).not.toBeInTheDocument();
  });

  it('allows stepping back and closing the dialog', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    const backButton = screen.getByRole('button', { name: /back to login/i });
    await user.click(backButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('resets the password, toasts success, and closes on update', async () => {
    const user = userEvent.setup();
    const onPasswordResetSuccess = vi.fn();
    const { onClose } = renderDialog({ onPasswordResetSuccess });

    await user.type(screen.getByLabelText(/email address/i), 'jane.doe@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByRole('heading', { name: /verify your email/i })).toBeInTheDocument();

    const otpInputs = screen.getAllByRole('textbox');
    for (const [index, digit] of ['0', '0', '0', '0', '0', '0'].entries()) {
      await user.type(otpInputs[index]!, digit);
    }
    await user.click(screen.getByRole('button', { name: /verify otp/i }));

    expect(
      await screen.findByRole('heading', { name: /create new password/i }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^new password$/i), 'Str0ng!Passw0rd');
    await user.type(screen.getByLabelText(/confirm new password/i), 'Str0ng!Passw0rd');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() =>
      expect(resetPasswordMock).toHaveBeenCalledWith({
        code: '000000',
        email: 'jane.doe@example.com',
        newPassword: 'Str0ng!Passw0rd',
      }),
    );
    expect(onPasswordResetSuccess).toHaveBeenCalledWith(
      'Password has been reset. Please sign in with your new password.',
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('shows email validation before calling the API', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(forgotPasswordMock).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(forgotPasswordMock).not.toHaveBeenCalled();
  });

  it('shows OTP validation when the code is incomplete', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByRole('heading', { name: /verify your email/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /verify otp/i }));
    expect(await screen.findByText(/verification code is required/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /verify your email/i })).toBeInTheDocument();
  });

  it('shows password policy validation on update', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/email address/i), 'jane.doe@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByRole('heading', { name: /verify your email/i })).toBeInTheDocument();

    const otpInputs = screen.getAllByRole('textbox');
    for (const [index, digit] of ['0', '0', '0', '0', '0', '0'].entries()) {
      await user.type(otpInputs[index]!, digit);
    }
    await user.click(screen.getByRole('button', { name: /verify otp/i }));
    expect(
      await screen.findByRole('heading', { name: /create new password/i }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^new password$/i), 'weak');
    await user.type(screen.getByLabelText(/confirm new password/i), 'different');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/passwords must match/i)).toBeInTheDocument();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });
});
