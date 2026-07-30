import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
} from '@/features/auth/types/auth.types';
import { httpClient } from '@/services/httpClient';

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await httpClient.post<AuthResponse>('/auth/register', payload);

    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await httpClient.post<AuthResponse>('/auth/login', payload);

    return data;
  },
};
