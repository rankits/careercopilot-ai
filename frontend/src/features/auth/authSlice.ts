import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { STORAGE_KEYS } from '@/constants/storage';
import { authService } from '@/features/auth/services/auth.service';
import type { AuthResponse, AuthState, LoginPayload, User } from '@/features/auth/types/auth.types';
import { storage } from '@/utils/storage';

const storedToken = storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
const storedUser = storage.get<User>(STORAGE_KEYS.USER);
const storedProfileComplete = storage.get<boolean>(STORAGE_KEYS.PROFILE_COMPLETE) ?? false;

const initialState: AuthState = {
  user: storedUser,
  accessToken: storedToken,
  isAuthenticated: Boolean(storedToken && storedUser),
  isProfileComplete: storedProfileComplete,
  isSessionResolved: !storedToken || !storedUser,
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk<AuthResponse, LoginPayload>('auth/login', async (payload) => {
  return authService.login(payload);
});

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
      storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
      storage.remove(STORAGE_KEYS.USER);
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
        storage.set(STORAGE_KEYS.ACCESS_TOKEN, action.payload.accessToken);
        storage.set(STORAGE_KEYS.USER, action.payload.user);
        persistProfileComplete(isProfileComplete);
      })
      .addCase(login.rejected, (state) => {
        state.isLoading = false;
        state.isSessionResolved = true;
        state.error = 'Unable to log in. Please try again.';
      });
  },
});

export const { logout, setProfileComplete, setSessionResolved, setAccessToken } = authSlice.actions;
export const authReducer = authSlice.reducer;
