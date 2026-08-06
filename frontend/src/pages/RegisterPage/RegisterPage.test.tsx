import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { RegisterPage } from './RegisterPage';

const { registerMock } = vi.hoisted(() => ({ registerMock: vi.fn() }));

vi.mock('@/features/auth/services/auth.service', () => ({
  authService: {
    register: registerMock,
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/register']}>
            <Routes>
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/profile" element={<h1>Profile destination</h1>} />
              <Route path="/login" element={<h1>Login destination</h1>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    ),
  };
}

function setupUser() {
  return userEvent.setup({ delay: null, pointerEventsCheck: 0 });
}

async function completeValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: /first name/i }), '  Ada  ');
  await user.type(screen.getByRole('textbox', { name: /last name/i }), '  Lovelace  ');
  await user.type(screen.getByRole('textbox', { name: /email address/i }), '  ADA@EXAMPLE.COM  ');
  await user.type(screen.getByRole('textbox', { name: /phone number/i }), '98765-43210');
  await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'Str0ng!Passw0rd');
  await user.type(
    screen.getByLabelText(/confirm password/i, { selector: 'input' }),
    'Str0ng!Passw0rd',
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    registerMock.mockReset();
  });

  it('renders the shared registration form and links to login', async () => {
    const user = setupUser();
    renderPage();

    expect(screen.getByRole('main')).toHaveStyle({ minHeight: '100dvh', overflow: 'visible' });
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /careercopilot/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /career journey illustration/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /login from header/i })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(
      screen.getByRole('heading', { name: /start your smarter career journey/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^smart job matching$/i)).toBeInTheDocument();
    expect(screen.getByText(/^ai-powered guidance$/i)).toBeInTheDocument();
    expect(screen.getByText(/^application tracking$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^secure & private$/i)).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /first name/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /last name/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /phone number/i })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /^login$/i }));

    expect(screen.getByRole('heading', { name: /login destination/i })).toBeInTheDocument();
  });

  it('blocks invalid input and explains every validation problem', async () => {
    const user = setupUser();
    renderPage();

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();
    expect(screen.getAllByText(/password is required/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/confirm password is required/i)).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: /first name/i }), 'Ada');
    await user.type(screen.getByRole('textbox', { name: /last name/i }), 'Lovelace');
    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'invalid-email');
    await user.type(screen.getByRole('textbox', { name: /phone number/i }), '123');
    await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'short');
    await user.type(screen.getByLabelText(/confirm password/i, { selector: 'input' }), 'different');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a valid phone number/i)).toBeInTheDocument();
    expect(
      screen.getByText(/use 8\+ characters with uppercase, lowercase, number/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/passwords must match/i)).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  }, 15_000);

  it('rejects a name containing only whitespace', async () => {
    const user = setupUser();
    renderPage();

    await user.type(screen.getByRole('textbox', { name: /first name/i }), '   ');
    await user.type(screen.getByRole('textbox', { name: /last name/i }), '   ');
    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'ada@example.com');
    await user.type(screen.getByRole('textbox', { name: /phone number/i }), '9876543210');
    await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'Str0ng!Passw0rd');
    await user.type(
      screen.getByLabelText(/confirm password/i, { selector: 'input' }),
      'Str0ng!Passw0rd',
    );
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  }, 15_000);

  it('submits normalized values and redirects after successful registration', async () => {
    const user = setupUser();
    registerMock.mockResolvedValue({
      accessToken: 'token',
      user: {
        email: 'ada@example.com',
        id: '1',
        name: 'Ada Lovelace',
        role: 'user',
        phone: '+919876543210',
      },
    });
    const { queryClient } = renderPage();

    await completeValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(registerMock).toHaveBeenCalledWith({
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        password: 'Str0ng!Passw0rd',
        phone: '9876543210',
      }),
    );
    expect(await screen.findByRole('heading', { name: /login destination/i })).toBeInTheDocument();
    expect(
      queryClient.getMutationCache().find({ mutationKey: ['auth', 'register'] })?.state.status,
    ).toBe('success');
  }, 15_000);

  it('disables submission while the request is pending and prevents duplicate requests', async () => {
    const user = setupUser();
    let resolveRequest: (() => void) | undefined;
    registerMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = () =>
          resolve({
            accessToken: 'token',
            user: { email: 'ada@example.com', id: '1', name: 'Ada', role: 'user' },
          });
      }),
    );
    renderPage();

    await completeValidForm(user);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    fireEvent.click(submitButton);
    expect(registerMock).toHaveBeenCalledTimes(1);

    resolveRequest?.();
  }, 15_000);

  it('shows an accessible API error and allows a retry', async () => {
    const user = setupUser();
    registerMock
      .mockRejectedValueOnce(new Error('Network details should not leak'))
      .mockResolvedValueOnce({
        accessToken: 'token',
        user: { email: 'ada@example.com', id: '1', name: 'Ada', role: 'user' },
      });
    renderPage();

    await completeValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert', undefined, { timeout: 5000 })).toHaveTextContent(
      /unable to create your account\. please try again/i,
    );
    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(registerMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole('heading', { name: /login destination/i })).toBeInTheDocument();
  }, 15_000);

  it('shows the backend registration error message when the API provides one', async () => {
    const user = setupUser();
    registerMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: {
          code: 'CONFLICT',
          message: 'This email already exists',
          requestId: '7b5b53e2-fcb4-43c8-b081-7dc26240182b',
          status: 'error',
        },
      },
    });
    renderPage();

    await completeValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/this email already exists/i);
  }, 15_000);
});
