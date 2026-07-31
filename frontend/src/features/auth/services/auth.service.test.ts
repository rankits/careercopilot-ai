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

  it('posts registration credentials and returns the response body', async () => {
    const response = {
      accessToken: 'token',
      user: { email: 'ada@example.com', id: '1', name: 'Ada', role: 'user' as const },
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
    ).resolves.toEqual(response);

    expect(postMock).toHaveBeenCalledWith('/auth/register', {
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      password: 'password123',
      phone: '+919876543210',
    });
  });

  it('propagates API failures for the caller to handle', async () => {
    const failure = new Error('Request failed');
    postMock.mockRejectedValue(failure);

    await expect(
      authService.register({
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        password: 'password123',
        phone: '+919876543210',
      }),
    ).rejects.toBe(failure);
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

  it('propagates login API failures for the caller to handle', async () => {
    const failure = new Error('Request failed');
    postMock.mockRejectedValue(failure);

    await expect(
      authService.login({ email: 'ada@example.com', password: 'password123' }),
    ).rejects.toBe(failure);
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
