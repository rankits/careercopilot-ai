import { createContext, useContext } from 'react';

export type ToastSeverity = 'success' | 'warning' | 'error' | 'info';

export interface ToastOptions {
  message: string;
  severity?: ToastSeverity;
  autoHideDuration?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    return {
      showToast: () => undefined,
    };
  }

  return context;
}
