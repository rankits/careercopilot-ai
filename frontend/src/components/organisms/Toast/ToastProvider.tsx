import { Snackbar, Alert } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';

import { ToastContext, type ToastOptions, type ToastSeverity } from './ToastContext';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<ToastSeverity>('info');
  const [autoHideDuration, setAutoHideDuration] = useState(4000);

  const showToast = useCallback((options: ToastOptions) => {
    setMessage(options.message);
    setSeverity(options.severity ?? 'info');
    setAutoHideDuration(options.autoHideDuration ?? 4000);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={autoHideDuration}
        open={open}
        onClose={(_, reason) => {
          if (reason === 'clickaway') {
            return;
          }

          setOpen(false);
        }}
      >
        <Alert onClose={() => setOpen(false)} severity={severity} sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
