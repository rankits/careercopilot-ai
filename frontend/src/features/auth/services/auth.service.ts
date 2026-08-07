import axios from 'axios';

import { env } from '@/config/env';
import type {
  AuthMessageResponse,
  AuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  User,
  VerifyForgotPasswordOtpPayload,
} from '@/features/auth/types/auth.types';
import { AuthRequestError, getAuthErrorMessage } from '@/features/auth/utils/apiError';
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
    let data: AuthApiResponse;
    try {
      ({ data } = await httpClient.post<AuthApiResponse>('/auth/register', payload));
    } catch (error) {
      throw new AuthRequestError(
        getAuthErrorMessage(error, 'Unable to create your account. Please try again.'),
      );
    }
    return parseAuthResponse(data);
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    let data: AuthApiResponse;
    try {
      ({ data } = await httpClient.post<AuthApiResponse>('/auth/login', payload));
    } catch (error) {
      throw new AuthRequestError(getAuthErrorMessage(error, 'Unable to log in. Please try again.'));
    }
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

  async forgotPassword(payload: ForgotPasswordPayload): Promise<AuthMessageResponse> {
    try {
      const { data, status } = await httpClient.post<AuthMessageResponse>('/auth/forgot-password', {
        email: payload.email.trim().toLowerCase(),
      });

      if (status < 200 || status >= 300 || data.status === 'error') {
        throw new AuthRequestError(
          typeof data.message === 'string' && data.message.length > 0
            ? data.message
            : 'Unable to send reset code. Please try again.',
        );
      }

      return {
        message:
          typeof data.message === 'string' && data.message.length > 0
            ? data.message
            : 'If an account with that email exists, a verification code has been sent.',
        status: 'success',
      };
    } catch (error) {
      if (error instanceof AuthRequestError) {
        throw error;
      }
      throw new AuthRequestError(
        getAuthErrorMessage(error, 'Unable to send reset code. Please try again.'),
      );
    }
  },

  async verifyForgotPasswordOtp(
    payload: VerifyForgotPasswordOtpPayload,
  ): Promise<AuthMessageResponse> {
    try {
      const { data, status } = await httpClient.post<AuthMessageResponse>(
        '/auth/forgot-password/verify-otp',
        {
          code: payload.code,
          email: payload.email.trim().toLowerCase(),
        },
      );

      if (status < 200 || status >= 300 || data.status === 'error') {
        throw new AuthRequestError(
          typeof data.message === 'string' && data.message.length > 0
            ? data.message
            : 'Invalid or expired verification code.',
        );
      }

      return {
        message:
          typeof data.message === 'string' && data.message.length > 0
            ? data.message
            : 'Verification code confirmed',
        status: 'success',
      };
    } catch (error) {
      if (error instanceof AuthRequestError) {
        throw error;
      }
      throw new AuthRequestError(
        getAuthErrorMessage(error, 'Invalid or expired verification code.'),
      );
    }
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<AuthMessageResponse> {
    try {
      const { data, status } = await httpClient.post<AuthMessageResponse>('/auth/reset-password', {
        code: payload.code,
        email: payload.email.trim().toLowerCase(),
        newPassword: payload.newPassword,
      });

      if (status < 200 || status >= 300 || data.status === 'error') {
        throw new AuthRequestError(
          typeof data.message === 'string' && data.message.length > 0
            ? data.message
            : 'Unable to reset password. Please try again.',
        );
      }

      return {
        message:
          typeof data.message === 'string' && data.message.length > 0
            ? data.message
            : 'Password has been reset. Please sign in with your new password.',
        status: 'success',
      };
    } catch (error) {
      if (error instanceof AuthRequestError) {
        throw error;
      }
      throw new AuthRequestError(
        getAuthErrorMessage(error, 'Unable to reset password. Please try again.'),
      );
    }
  },

  /**
   * Silent session restore via httpOnly refresh cookie.
   * Uses a bare axios call so the shared httpClient 401 interceptor cannot loop.
   */
  async refreshSession(): Promise<{ accessToken: string }> {
    const { data } = await axios.post<{ accessToken?: string }>(
      `${env.apiBaseUrl}/auth/refresh-token`,
      {},
      { withCredentials: true },
    );

    if (typeof data.accessToken !== 'string' || data.accessToken.length === 0) {
      throw new AuthRequestError('Missing access token in refresh response');
    }

    return { accessToken: data.accessToken };
  },

  async getCurrentUser(): Promise<User> {
    const { data } = await httpClient.get<{ data?: User }>('/auth/me');

    if (!data.data) {
      throw new AuthRequestError('Missing user data in session response');
    }

    return normalizeUser(data.data);
  },
};
