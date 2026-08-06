import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AuthForm } from './AuthForm';

describe('AuthForm', () => {
  it('renders social actions and credential fields', () => {
    render(<AuthForm />);

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with linkedin/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeChecked();
  });

  it('renders registration fields when register mode is selected', () => {
    render(<AuthForm mode="register" />);

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /first name/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /last name/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByTestId('PhoneOutlinedIcon')).toBeInTheDocument();
    expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /remember me/i })).not.toBeInTheDocument();
  });

  it('applies auth field length limits on login and register inputs', () => {
    const { rerender } = render(<AuthForm />);

    expect(screen.getByRole('textbox', { name: /email address/i })).toHaveAttribute(
      'maxlength',
      '300',
    );
    expect(screen.getByLabelText(/^password$/i, { selector: 'input' })).toHaveAttribute(
      'maxlength',
      '128',
    );

    rerender(<AuthForm mode="register" />);

    expect(screen.getByRole('textbox', { name: /first name/i })).toHaveAttribute('maxlength', '80');
    expect(screen.getByRole('textbox', { name: /last name/i })).toHaveAttribute('maxlength', '80');
    expect(screen.getByRole('textbox', { name: /email address/i })).toHaveAttribute(
      'maxlength',
      '300',
    );
    expect(screen.getByRole('textbox', { name: /phone number/i })).toHaveAttribute(
      'maxlength',
      '10',
    );
    expect(screen.getByLabelText(/^password$/i, { selector: 'input' })).toHaveAttribute(
      'maxlength',
      '128',
    );
    expect(screen.getByLabelText(/confirm password/i, { selector: 'input' })).toHaveAttribute(
      'maxlength',
      '128',
    );
  });

  it('prevents limited auth fields from keeping text beyond their max length', () => {
    render(<AuthForm mode="register" />);
    const longName = 'A'.repeat(81);
    const longEmail = `${'a'.repeat(300)}@example.com`;
    const longPhone = '1'.repeat(11);
    const longPassword = 'P'.repeat(129);

    const firstNameInput = screen.getByRole('textbox', { name: /first name/i });
    const emailInput = screen.getByRole('textbox', { name: /email address/i });
    const phoneInput = screen.getByRole('textbox', { name: /phone number/i });
    const passwordInput = screen.getByLabelText(/^password$/i, { selector: 'input' });

    fireEvent.input(firstNameInput, { target: { value: longName } });
    fireEvent.input(emailInput, { target: { value: longEmail } });
    fireEvent.input(phoneInput, { target: { value: longPhone } });
    fireEvent.input(passwordInput, { target: { value: longPassword } });

    expect(firstNameInput).toHaveValue('A'.repeat(80));
    expect(emailInput).toHaveValue(longEmail.slice(0, 300));
    expect(phoneInput).toHaveValue('1'.repeat(10));
    expect(passwordInput).toHaveValue('P'.repeat(128));
  });

  it('submits the form and calls social handlers', async () => {
    const user = userEvent.setup();
    const handleGoogle = vi.fn();
    const handleLinkedIn = vi.fn();
    const handleSubmit = vi.fn();

    render(
      <AuthForm
        onGoogleConnect={handleGoogle}
        onLinkedInConnect={handleLinkedIn}
        onValidSubmit={handleSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: /continue with google/i }));
    await user.click(screen.getByRole('button', { name: /continue with linkedin/i }));
    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'user@example.com');
    await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(handleGoogle).toHaveBeenCalledTimes(1);
    expect(handleLinkedIn).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));
  });

  it('shows validation errors from the active yup schema', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(<AuthForm onValidSubmit={handleSubmit} />);

    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('renders custom extra fields', () => {
    render(
      <AuthForm
        extraFields={[
          {
            label: 'Current role',
            name: 'role',
            placeholder: 'Frontend Engineer',
            startIcon: 'person',
            type: 'text',
          },
        ]}
        mode="register"
      />,
    );

    expect(screen.getByRole('textbox', { name: /current role/i })).toBeInTheDocument();
  });

  it('keeps only ten digits in the phone number field', async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="register" />);
    const phoneInput = screen.getByRole('textbox', { name: /phone number/i });

    await user.type(phoneInput, '+91 98765@43210');

    expect(phoneInput).toHaveValue('9198765432');
  });

  it('disables submit action while submitting', () => {
    render(<AuthForm isSubmitting />);

    expect(screen.getByRole('button', { name: /login/i })).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('can hide social login actions', () => {
    render(<AuthForm showSocialLogin={false} />);

    expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /continue with linkedin/i }),
    ).not.toBeInTheDocument();
  });
});
