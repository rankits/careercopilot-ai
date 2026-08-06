import { Snackbar, Alert } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';

import { DEFAULT_AUTO_HIDE_DURATION } from './constants';
import { ToastContext, type ToastOptions, type ToastSeverity } from './ToastContext';

interface ToastState {
  autoHideDuration: number;
  message: string;
  severity: ToastSeverity;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((options: ToastOptions) => {
    setToast({
      autoHideDuration: options.autoHideDuration ?? DEFAULT_AUTO_HIDE_DURATION,
      message: options.message,
      severity: options.severity ?? 'info',
    });
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={toast?.autoHideDuration}
        open={Boolean(toast)}
        onClose={(_, reason) => {
          if (reason === 'clickaway') {
            return;
          }

          setToast(null);
        }}
        sx={{ top: { xs: '1rem', sm: '1.25rem' } }}
      >
        <Alert onClose={() => setToast(null)} severity={toast?.severity} sx={{ width: '100%' }}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
