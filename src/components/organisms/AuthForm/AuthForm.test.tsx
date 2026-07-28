import { render, screen } from '@testing-library/react';
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
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeChecked();
  });

  it('renders registration fields when register mode is selected', () => {
    render(<AuthForm mode="register" />);

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /full name/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /remember me/i })).not.toBeInTheDocument();
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
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(handleGoogle).toHaveBeenCalledTimes(1);
    expect(handleLinkedIn).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledTimes(1);
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
