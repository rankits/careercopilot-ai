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

describe('authService Google login', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('starts Google login and returns the authorization URL', async () => {
    postMock.mockResolvedValue({
      data: {
        data: { authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?mock=1' },
      },
    });

    await expect(authService.startGoogleLogin({ returnPath: '/app' })).resolves.toEqual({
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?mock=1',
    });
    expect(postMock).toHaveBeenCalledWith('/auth/google/start', { returnPath: '/app' });
  });

  it('completes Google login and returns a normalized session', async () => {
    postMock.mockResolvedValue({
      data: {
        accessToken: 'token',
        data: {
          returnPath: '/jobs-feed',
          user: {
            email: 'ada@example.com',
            firstName: 'Ada',
            id: '1',
            lastName: 'Lovelace',
            role: 'USER' as const,
          },
        },
      },
    });

    await expect(
      authService.completeGoogleLogin({ code: 'code', state: 'state' }),
    ).resolves.toEqual({
      accessToken: 'token',
      accessTokenExpiresInSeconds: undefined,
      returnPath: '/jobs-feed',
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
    expect(postMock).toHaveBeenCalledWith('/auth/google/callback', {
      code: 'code',
      state: 'state',
    });
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
