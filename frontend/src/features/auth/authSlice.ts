import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { STORAGE_KEYS } from '@/constants/storage';
import { authService } from '@/features/auth/services/auth.service';
import type { AuthResponse, AuthState, LoginPayload } from '@/features/auth/types/auth.types';
import { getAuthErrorMessage } from '@/features/auth/utils/apiError';
import {
  invalidateAuthSession,
  persistAuthSession,
  setAccessToken as persistMemoryAccessToken,
} from '@/features/auth/utils/authSession';
import { storage } from '@/utils/storage';

const storedProfileComplete = storage.get<boolean>(STORAGE_KEYS.PROFILE_COMPLETE) ?? false;

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isProfileComplete: storedProfileComplete,
  // Always bootstrap via refresh cookie — access token is memory-only.
  isSessionResolved: false,
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
      invalidateAuthSession();
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
      persistMemoryAccessToken(action.payload);
      state.accessToken = action.payload;
      if (state.user) {
        state.isAuthenticated = true;
      }
    },
    establishSession(state, action: PayloadAction<AuthResponse>) {
      const isProfileComplete = action.payload.user.isProfileCreated === true;
      state.isLoading = false;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.isProfileComplete = isProfileComplete;
      state.isSessionResolved = true;
      state.error = null;
      persistAuthSession(action.payload.accessToken, action.payload.user);
      persistProfileComplete(isProfileComplete);
    },
    establishSession(state, action: PayloadAction<AuthResponse>) {
      const isProfileComplete = action.payload.user.isProfileCreated === true;
      state.isLoading = false;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.isProfileComplete = isProfileComplete;
      state.isSessionResolved = true;
      state.error = null;
      persistAuthSession(action.payload.accessToken, action.payload.user);
      persistProfileComplete(isProfileComplete);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        // Keep isSessionResolved true — flipping it false unmounts GuestRoute
        // (login form → blank loader flash) and retriggers auth bootstrap.
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

export const { logout, setProfileComplete, setSessionResolved, setAccessToken, establishSession } =
  authSlice.actions;
export const authReducer = authSlice.reducer;
