import { z } from 'zod';

export const redeemPairingCodeSchema = z.object({
  body: z.object({
    pairingCode: z.string().length(6, 'Pairing code must be exactly 6 characters'),
  }),
});

export const revokeDeviceSchema = z.object({
  params: z.object({
    deviceId: z.string().transform((val) => parseInt(val, 10)),
  }),
});
