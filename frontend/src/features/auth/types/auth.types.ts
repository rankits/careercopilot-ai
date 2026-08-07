export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileImage?: string | null;
  bio?: string | null;
  status?: string;
  isEmailVerified?: boolean;
  isProfileCreated?: boolean;
  role: 'USER' | 'ADMIN' | 'user' | 'admin';
  createdAt?: string;
  name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyForgotPasswordOtpPayload {
  code: string;
  email: string;
}

export interface ResetPasswordPayload {
  code: string;
  email: string;
  newPassword: string;
}

export interface AuthMessageResponse {
  message: string;
  status?: 'success' | 'error';
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresInSeconds?: number;
  user: User;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  isSessionResolved: boolean;
  isLoading: boolean;
  error: string | null;
}
