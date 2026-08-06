import { Router } from 'express';
import { ExtensionPairingController } from '@/modules/extension/controllers/pairing.controller.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requireRole } from '@/shared/middlewares/rbac.middleware.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { redeemPairingCodeSchema, revokeDeviceSchema } from '@/modules/extension/validations/pairing.validation.js';

const router = Router();

// Used by the web app to initiate pairing
router.post(
  '/pair/start',
  authMiddleware,
  requireRole('USER'),
  ExtensionPairingController.startPairing
);

// Used by the extension to redeem the code
// No requireAuth here, as the user is not authenticated yet in the extension
router.post(
  '/pair/complete',
  validateResource(redeemPairingCodeSchema),
  ExtensionPairingController.redeemPairingCode
);

// Used by the web app to manage paired devices
router.get(
  '/devices',
  authMiddleware,
  requireRole('USER'),
  ExtensionPairingController.listDevices
);

router.delete(
  '/devices/:deviceId',
  authMiddleware,
  requireRole('USER'),
  validateResource(revokeDeviceSchema),
  ExtensionPairingController.revokeDevice
);

export default router;
