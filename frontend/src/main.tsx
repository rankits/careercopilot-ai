import { ThemeProvider } from '@mui/material/styles';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { logout, setAccessToken } from '@/features/auth/authSlice';
import { appRouter } from '@/routes/AppRouter';
import { setTokenRefreshedHandler, setUnauthorizedHandler } from '@/services/httpClient';
import { queryClient } from '@/services/queryClient';
import { store } from '@/store';
import { appTheme } from '@/theme';
import '@/styles/global.css';

setUnauthorizedHandler(() => {
  store.dispatch(logout());
});

setTokenRefreshedHandler((accessToken) => {
  store.dispatch(setAccessToken(accessToken));
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ThemeProvider theme={appTheme}>
          <ToastProvider>
            <RouterProvider router={appRouter} />
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    </QueryClientProvider>
  </React.StrictMode>,
);
