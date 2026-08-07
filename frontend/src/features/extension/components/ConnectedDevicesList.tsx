import React, { useEffect, useState } from 'react';

import { Button } from '@/components/atoms';

import type { ExtensionDevice } from '../services/extension.service';
import { extensionService } from '../services/extension.service';

export const ConnectedDevicesList: React.FC = () => {
  const [devices, setDevices] = useState<ExtensionDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await extensionService.getDevices();
      setDevices(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchDevices();
  }, []);

  const handleRevoke = async (id: number) => {
    try {
      await extensionService.revokeDevice(id);
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to revoke device');
    }
  };

  if (isLoading) {
    return <div className="py-4 text-sm text-gray-500">Loading devices...</div>;
  }

  if (error) {
    return <div className="py-4 text-sm text-red-500">{error}</div>;
  }

  if (devices.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-800/50">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No browser extensions connected yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {devices.map((device) => (
        <div
          key={device.id}
          className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
        >
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {device.userAgent ? device.userAgent.split(' ')[0] : 'Browser Extension'}
            </p>
            <p className="text-xs text-gray-500">
              Connected on {new Date(device.createdAt).toLocaleDateString()}
              {device.ipAddress && ` • ${device.ipAddress}`}
            </p>
          </div>
          <Button
            variant="outline"
            size="small"
            tone="danger"
            onClick={() => void handleRevoke(device.id)}
            className="dark:border-gray-600 dark:hover:bg-red-900/20"
          >
            Revoke Access
          </Button>
        </div>
      ))}
    </div>
  );
};
