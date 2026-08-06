import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authService } from './auth.service';

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock('@/services/httpClient', () => ({
  httpClient: {
    post: postMock,
  },
}));

describe('authService register', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('posts registration credentials and returns the normalized auth response', async () => {
    const response = {
      accessToken: 'token',
      data: {
        user: {
          email: 'ada@example.com',
          firstName: 'Ada',
          id: '1',
          lastName: 'Lovelace',
          role: 'USER' as const,
        },
      },
    };
    postMock.mockResolvedValue({ data: response });

    await expect(
      authService.register({
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        password: 'password123',
        phone: '+919876543210',
      }),
    ).resolves.toEqual({
      accessToken: 'token',
      accessTokenExpiresInSeconds: undefined,
      user: {
        email: 'ada@example.com',
        firstName: 'Ada',
        id: '1',
        isProfileCreated: false,
        lastName: 'Lovelace',
        name: 'Ada Lovelace',
        role: 'user',
      },
    });

    expect(postMock).toHaveBeenCalledWith('/auth/register', {
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      password: 'password123',
      phone: '+919876543210',
    });
  });

  it('propagates API failures for the caller to handle', async () => {
    postMock.mockRejectedValue(new Error('Request failed'));

    await expect(
      authService.register({
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        password: 'password123',
        phone: '+919876543210',
      }),
    ).rejects.toThrow('Unable to create your account. Please try again.');
  });
});

describe('authService login', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('posts login credentials and returns the normalized auth payload', async () => {
    postMock.mockResolvedValue({
      data: {
        accessToken: 'token',
        data: {
          user: {
            email: 'ada@example.com',
            firstName: 'Ada',
            id: '1',
            isProfileCreated: true,
            lastName: 'Lovelace',
            role: 'USER',
          },
        },
      },
    });

    await expect(
      authService.login({ email: 'ada@example.com', password: 'password123' }),
    ).resolves.toEqual({
      accessToken: 'token',
      accessTokenExpiresInSeconds: undefined,
      user: {
        email: 'ada@example.com',
        firstName: 'Ada',
        id: '1',
        isProfileCreated: true,
        lastName: 'Lovelace',
        name: 'Ada Lovelace',
        role: 'user',
      },
    });

    expect(postMock).toHaveBeenCalledWith('/auth/login', {
      email: 'ada@example.com',
      password: 'password123',
    });
  });

  it('defaults isProfileCreated to false when the flag is missing on the user', async () => {
    postMock.mockResolvedValue({
      data: {
        accessToken: 'token',
        data: {
          user: { email: 'ada@example.com', id: '1', name: 'Ada', role: 'user' },
        },
      },
    });

    await expect(
      authService.login({ email: 'ada@example.com', password: 'password123' }),
    ).resolves.toMatchObject({ user: { isProfileCreated: false } });
  });

  it('falls back to the top-level user and normalises an admin role', async () => {
    postMock.mockResolvedValue({
      data: {
        accessToken: 'token',
        accessTokenExpiresInSeconds: 3600,
        user: { email: 'root@example.com', id: '9', role: 'ADMIN' },
      },
    });

    await expect(
      authService.login({ email: 'root@example.com', password: 'password123' }),
    ).resolves.toEqual({
      accessToken: 'token',
      accessTokenExpiresInSeconds: 3600,
      user: {
        email: 'root@example.com',
        id: '9',
        isProfileCreated: false,
        name: 'root@example.com',
        role: 'admin',
      },
    });
  });

  it('keeps unknown roles as-is', async () => {
    postMock.mockResolvedValue({
      data: {
        accessToken: 'token',
        data: {
          user: { email: 'mg@example.com', id: '3', name: 'M', role: 'MANAGER' },
        },
      },
    });

    await expect(
      authService.login({ email: 'mg@example.com', password: 'password123' }),
    ).resolves.toMatchObject({ user: { role: 'MANAGER' } });
  });

  it('throws when the response omits a user', async () => {
    postMock.mockResolvedValue({ data: { accessToken: 'token' } });

    await expect(
      authService.login({ email: 'ada@example.com', password: 'password123' }),
    ).rejects.toThrow('Missing user data in auth response');
  });

  it('throws when the response omits an access token', async () => {
    postMock.mockResolvedValue({
      data: {
        data: { user: { email: 'ada@example.com', id: '1', name: 'Ada', role: 'user' } },
      },
    });

    await expect(
      authService.login({ email: 'ada@example.com', password: 'password123' }),
    ).rejects.toThrow('Missing access token in auth response');
  });

  it('propagates login API failures for the caller to handle', async () => {
    postMock.mockRejectedValue(new Error('Request failed'));

    await expect(
      authService.login({ email: 'ada@example.com', password: 'password123' }),
    ).rejects.toThrow('Unable to log in. Please try again.');
  });
});

describe('authService logout', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('posts to the logout endpoint', async () => {
    postMock.mockResolvedValue({ data: { message: 'Logged out successfully', status: 'success' } });

    await expect(authService.logout()).resolves.toEqual({ message: 'Logged out successfully' });
    expect(postMock).toHaveBeenCalledWith('/auth/logout', {});
  });

  it('falls back to a default message when the API omits one', async () => {
    postMock.mockResolvedValue({ data: { status: 'success' } });

    await expect(authService.logout()).resolves.toEqual({ message: 'Logged out successfully' });
  });

  it('propagates logout API failures for the caller to handle', async () => {
    const failure = new Error('Request failed');
    postMock.mockRejectedValue(failure);

    await expect(authService.logout()).rejects.toBe(failure);
  });
});

describe('authService forgotPassword', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('posts the email and returns the API message', async () => {
    postMock.mockResolvedValue({
      data: {
        message: 'If an account with that email exists, a verification code has been sent.',
        status: 'success',
      },
      status: 200,
    });

    await expect(
      authService.forgotPassword({ email: '  Jane.Doe@example.com  ' }),
    ).resolves.toEqual({
      message: 'If an account with that email exists, a verification code has been sent.',
      status: 'success',
    });
    expect(postMock).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'jane.doe@example.com',
    });
  });

  it('rejects when the API body status is error', async () => {
    postMock.mockResolvedValue({
      data: { message: 'Too many requests', status: 'error' },
      status: 200,
    });

    await expect(authService.forgotPassword({ email: 'jane.doe@example.com' })).rejects.toThrow(
      'Too many requests',
    );
  });

  it('propagates forgot-password API failures', async () => {
    postMock.mockRejectedValue(new Error('Request failed'));

    await expect(authService.forgotPassword({ email: 'jane.doe@example.com' })).rejects.toThrow(
      'Unable to send reset code. Please try again.',
    );
  });
});

describe('authService resetPassword', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('posts email, code, and new password', async () => {
    postMock.mockResolvedValue({
      data: {
        message: 'Password has been reset. Please sign in with your new password.',
        status: 'success',
      },
      status: 200,
    });

    await expect(
      authService.resetPassword({
        code: '000000',
        email: 'Jane.Doe@example.com',
        newPassword: 'Str0ng!Passw0rd',
      }),
    ).resolves.toEqual({
      message: 'Password has been reset. Please sign in with your new password.',
      status: 'success',
    });
    expect(postMock).toHaveBeenCalledWith('/auth/reset-password', {
      code: '000000',
      email: 'jane.doe@example.com',
      newPassword: 'Str0ng!Passw0rd',
    });
  });

  it('rejects when the API body status is error', async () => {
    postMock.mockResolvedValue({
      data: { message: 'Invalid or expired code', status: 'error' },
      status: 200,
    });

    await expect(
      authService.resetPassword({
        code: '000000',
        email: 'jane.doe@example.com',
        newPassword: 'Str0ng!Passw0rd',
      }),
    ).rejects.toThrow('Invalid or expired code');
  });

  it('propagates reset-password API failures', async () => {
    postMock.mockRejectedValue(new Error('Request failed'));

    await expect(
      authService.resetPassword({
        code: '000000',
        email: 'jane.doe@example.com',
        newPassword: 'Str0ng!Passw0rd',
      }),
    ).rejects.toThrow('Unable to reset password. Please try again.');
  });
});
