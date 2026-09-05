import type { User } from '@/features/auth/types/auth.types';
import { httpClient } from '@/services/httpClient';

interface BackendSuccessResponse<T> {
  data: T;
  message: string;
  status: 'success';
}

export interface UpdateUserProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
}

export const userService = {
  async getMe(): Promise<User> {
    const { data } = await httpClient.get<BackendSuccessResponse<User>>('/users/me');
    if (!data.data) {
      throw new Error('Missing user data in API response');
    }
    return data.data;
  },

  async updateMe(payload: UpdateUserProfilePayload): Promise<User> {
    const { data } = await httpClient.patch<BackendSuccessResponse<User>>('/users/me', payload);
    if (!data.data) {
      throw new Error('Missing user data in API response');
    }
    return data.data;
  },
};
