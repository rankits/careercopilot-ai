import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { STORAGE_KEYS } from '@/constants/storage';
import { authService } from '@/features/auth/services/auth.service';
import type { AuthState, LoginPayload, User } from '@/features/auth/types/auth.types';
import { storage } from '@/utils/storage';

const storedToken = storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
const storedUser = storage.get<User>(STORAGE_KEYS.USER);

const initialState: AuthState = {
  user: storedUser,
  accessToken: storedToken,
  isAuthenticated: Boolean(storedToken && storedUser),
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk('auth/login', async (payload: LoginPayload) => {
  return authService.login(payload);
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
      storage.remove(STORAGE_KEYS.USER);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        storage.set(STORAGE_KEYS.ACCESS_TOKEN, action.payload.accessToken);
        storage.set(STORAGE_KEYS.USER, action.payload.user);
      })
      .addCase(login.rejected, (state) => {
        state.isLoading = false;
        state.error = 'Unable to log in. Please try again.';
      });
  },
});

export const { logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
