import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { STORAGE_KEYS } from '@/constants/storage';
import { authService } from '@/features/auth/services/auth.service';
import type { AuthResponse, AuthState, LoginPayload } from '@/features/auth/types/auth.types';
import { getAuthErrorMessage } from '@/features/auth/utils/apiError';
import {
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  hasAuthSession,
  persistAuthSession,
} from '@/features/auth/utils/authSession';
import { storage } from '@/utils/storage';

const storedProfileComplete = storage.get<boolean>(STORAGE_KEYS.PROFILE_COMPLETE) ?? false;

const initialState: AuthState = {
  user: getStoredUser(),
  accessToken: getAccessToken(),
  isAuthenticated: hasAuthSession(),
  isProfileComplete: storedProfileComplete,
  isSessionResolved: !getAccessToken() || !getStoredUser(),
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk<AuthResponse, LoginPayload, { rejectValue: string }>(
  'auth/login',
  async (payload, { rejectWithValue }) => {
    try {
      return await authService.login(payload);
    } catch (error) {
      const message = getAuthErrorMessage(error, 'Unable to log in. Please try again.');

      return rejectWithValue(message);
    }
  },
);

const persistProfileComplete = (isComplete: boolean) => {
  storage.set(STORAGE_KEYS.PROFILE_COMPLETE, isComplete);
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.isProfileComplete = false;
      state.isSessionResolved = true;
      state.error = null;
      clearAuthSession();
      storage.remove(STORAGE_KEYS.PROFILE_COMPLETE);
    },
    setProfileComplete(state, action: PayloadAction<boolean>) {
      state.isProfileComplete = action.payload;
      if (state.user) {
        state.user = { ...state.user, isProfileCreated: action.payload };
        storage.set(STORAGE_KEYS.USER, state.user);
      }
      persistProfileComplete(action.payload);
    },
    setSessionResolved(state, action: PayloadAction<boolean>) {
      state.isSessionResolved = action.payload;
    },
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.isSessionResolved = false;
      })
      .addCase(login.fulfilled, (state, action) => {
        const isProfileComplete = action.payload.user.isProfileCreated === true;
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.isProfileComplete = isProfileComplete;
        state.isSessionResolved = true;
        persistAuthSession(action.payload.accessToken, action.payload.user);
        persistProfileComplete(isProfileComplete);
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isSessionResolved = true;
        state.error = action.payload ?? 'Unable to log in. Please try again.';
      });
  },
});

export const { logout, setProfileComplete, setSessionResolved, setAccessToken } = authSlice.actions;
export const authReducer = authSlice.reducer;
