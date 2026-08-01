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
    isProfileCreated: user.isProfileCreated === true,
    name: user.name ?? (fullName || user.email),
    role: user.role === 'USER' ? 'user' : user.role === 'ADMIN' ? 'admin' : user.role,
  };
};

type AuthApiResponse = {
  accessToken: string;
  accessTokenExpiresInSeconds?: number;
  data?: { user?: User };
  user?: User;
};

function parseAuthResponse(data: AuthApiResponse): AuthResponse {
  const user = data.data?.user ?? data.user;

  if (!user) {
    throw new Error('Missing user data in auth response');
  }

  if (!data.accessToken) {
    throw new Error('Missing access token in auth response');
  }

  return {
    accessToken: data.accessToken,
    accessTokenExpiresInSeconds: data.accessTokenExpiresInSeconds,
    user: normalizeUser(user),
  };
}

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await httpClient.post<AuthApiResponse>('/auth/register', payload);

    return parseAuthResponse(data);
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await httpClient.post<AuthApiResponse>('/auth/login', payload);

    return parseAuthResponse(data);
  },

  async logout(): Promise<{ message: string }> {
    const { data } = await httpClient.post<{ message?: string }>('/auth/logout', {});
    return {
      message:
        typeof data.message === 'string' && data.message.length > 0
          ? data.message
          : 'Logged out successfully',
    };
  },
};
