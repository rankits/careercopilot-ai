import { Snackbar, Alert, Button } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';

import { DEFAULT_AUTO_HIDE_DURATION } from './constants';
import { ToastContext, type ToastOptions, type ToastSeverity } from './ToastContext';

interface ToastState {
  autoHideDuration: number;
  message: string;
  severity: ToastSeverity;
  actionLabel?: string;
  onAction?: () => void;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((options: ToastOptions) => {
    setToast({
      autoHideDuration: options.autoHideDuration ?? DEFAULT_AUTO_HIDE_DURATION,
      message: options.message,
      severity: options.severity ?? 'info',
      actionLabel: options.actionLabel,
      onAction: options.onAction,
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
        sx={{ top: { xs: '4.75rem', sm: '5rem' } }}
      >
        <Alert
          action={
            toast?.actionLabel && toast?.onAction ? (
              <Button
                color="inherit"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
                size="small"
              >
                {toast.actionLabel}
              </Button>
            ) : undefined
          }
          aria-live={toast?.severity === 'error' ? 'assertive' : 'polite'}
          onClose={() => setToast(null)}
          role="status"
          severity={toast?.severity}
          sx={{ width: '100%' }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
