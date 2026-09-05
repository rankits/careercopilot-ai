import React, { useState, useEffect } from 'react';

import { Button } from '@/components/atoms';

import type { PairingSession } from '../services/extension.service';
import { extensionService } from '../services/extension.service';

interface ConnectExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectExtensionModal: React.FC<ConnectExtensionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [session, setSession] = useState<PairingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      void handleStartPairing();
    } else {
      setSession(null);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (session) {
      timer = setInterval(() => {
        const remaining = Math.max(0, new Date(session.expiresAt).getTime() - Date.now());
        setTimeLeft(remaining);
        if (remaining === 0) {
          setSession(null);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [session]);

  const handleStartPairing = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await extensionService.startPairing();
      setSession(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start pairing');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          Connect Browser Extension
        </h2>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
            <p className="mt-4 text-sm text-gray-500">Generating secure pairing code...</p>
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <Button onClick={() => void handleStartPairing()} className="mt-4" variant="outline">
              Try Again
            </Button>
          </div>
        ) : session ? (
          <div className="flex flex-col items-center py-4">
            <p className="mb-6 text-center text-sm text-gray-600 dark:text-gray-300">
              Enter this 6-digit code in the Career Copilot browser extension to securely connect
              your account.
            </p>

            <div className="mb-6 flex space-x-2 text-center font-mono text-4xl font-bold tracking-widest text-primary-600 dark:text-primary-400">
              {session.pairingCode}
            </div>

            <p className="text-sm font-medium text-gray-500">
              Code expires in: {Math.ceil(timeLeft / 1000)}s
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end space-x-3">
          <Button onClick={onClose} variant="outline">
            {session ? 'Done' : 'Cancel'}
          </Button>
        </div>
      </div>
    </div>
  );
};
