import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { App } from '@/app/App';
import { ThemeProvider } from '@/lib/material';
import { queryClient } from '@/services/queryClient';
import { store } from '@/store';
import { appTheme } from '@/theme';
import '@/styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ThemeProvider theme={appTheme}>
          <ToastProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    </QueryClientProvider>
  </React.StrictMode>,
);
