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
        name: 'Ada',
        password: 'password123',
        phoneNumber: '+919876543210',
      }),
    ).resolves.toEqual(response);

    expect(postMock).toHaveBeenCalledWith('/auth/register', {
      email: 'ada@example.com',
      name: 'Ada',
      password: 'password123',
      phoneNumber: '+919876543210',
    });
  });

  it('propagates API failures for the caller to handle', async () => {
    const failure = new Error('Request failed');
    postMock.mockRejectedValue(failure);

    await expect(
      authService.register({
        email: 'ada@example.com',
        name: 'Ada',
        password: 'password123',
        phoneNumber: '+919876543210',
      }),
    ).rejects.toBe(failure);
  });
});

describe('authService login', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('posts login credentials and returns the response body', async () => {
    const response = {
      accessToken: 'token',
      user: { email: 'ada@example.com', id: '1', name: 'Ada', role: 'user' as const },
    };
    postMock.mockResolvedValue({ data: response });

    await expect(
      authService.login({ email: 'ada@example.com', password: 'password123' }),
    ).resolves.toEqual(response);

    expect(postMock).toHaveBeenCalledWith('/auth/login', {
      email: 'ada@example.com',
      password: 'password123',
    });
  });

  it('propagates login API failures for the caller to handle', async () => {
    const failure = new Error('Request failed');
    postMock.mockRejectedValue(failure);

    await expect(
      authService.login({ email: 'ada@example.com', password: 'password123' }),
    ).rejects.toBe(failure);
  });
});
