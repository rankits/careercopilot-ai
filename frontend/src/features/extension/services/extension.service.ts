import { httpClient } from '@/services/httpClient';

export interface ExtensionDevice {
  id: number;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface PairingSession {
  pairingCode: string;
  expiresAt: string;
}

export const extensionService = {
  async startPairing(): Promise<PairingSession> {
    const { data } = await httpClient.post<{ data: PairingSession }>('/extension/pair/start');
    return data.data;
  },

  async getDevices(): Promise<ExtensionDevice[]> {
    const { data } = await httpClient.get<{ data: ExtensionDevice[] }>('/extension/devices');
    return data.data;
  },

  async revokeDevice(deviceId: number): Promise<void> {
    await httpClient.delete(`/extension/devices/${deviceId}`);
  },
};
