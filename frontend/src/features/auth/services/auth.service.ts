import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from '@/features/auth/types/auth.types';
import { httpClient } from '@/services/httpClient';

const normalizeUser = (user: User) => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();

  return {
    ...user,
    name: user.name ?? (fullName || user.email),
    role: user.role === 'USER' ? 'user' : user.role === 'ADMIN' ? 'admin' : user.role,
  };
};

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await httpClient.post<AuthResponse>('/auth/register', payload);

    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await httpClient.post<{
      accessToken: string;
      accessTokenExpiresInSeconds?: number;
      data?: { user?: User };
      user?: User;
    }>('/auth/login', payload);

    const user = data.data?.user ?? data.user;

    if (!user) {
      throw new Error('Missing user data in login response');
    }

    return {
      accessToken: data.accessToken,
      accessTokenExpiresInSeconds: data.accessTokenExpiresInSeconds,
      user: normalizeUser(user),
    };
  },
};
