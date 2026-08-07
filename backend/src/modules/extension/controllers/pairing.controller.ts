import type { Request, Response, NextFunction } from 'express';
import { ExtensionPairingService } from '@/modules/extension/services/pairing.service.js';
import { requireUserPrincipalId } from '@/modules/auto-apply/utils/require-user.util.js';

export const ExtensionPairingController = {
  startPairing: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(requireUserPrincipalId(req), 10);
      const { code, expiresAt } = await ExtensionPairingService.startPairing(userId);
      res.status(201).json({
        data: {
          pairingCode: code,
          expiresAt: expiresAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  redeemPairingCode: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pairingCode } = req.body;
      const clientInfo = {
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      };
      
      const tokens = await ExtensionPairingService.redeemPairingCode(pairingCode, clientInfo);
      
      res.status(200).json({
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  },

  listDevices: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(requireUserPrincipalId(req), 10);
      const devices = await ExtensionPairingService.listDevices(userId);
      res.status(200).json({
        data: devices,
      });
    } catch (error) {
      next(error);
    }
  },

  revokeDevice: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(requireUserPrincipalId(req), 10);
      const deviceIdStr = Array.isArray(req.params.deviceId) ? req.params.deviceId[0] : req.params.deviceId;
      const deviceId = parseInt(deviceIdStr || '', 10);
      await ExtensionPairingService.revokeDevice(userId, deviceId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
