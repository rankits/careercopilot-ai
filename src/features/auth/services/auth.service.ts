import type { AuthResponse, LoginPayload } from '@/features/auth/types/auth.types';

const MOCK_DELAY = 500;

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));

    return {
      accessToken: 'demo-access-token',
      user: {
        id: '1',
        name: payload.email.split('@')[0] || 'User',
        email: payload.email,
        role: 'user',
      },
    };
  },
};
