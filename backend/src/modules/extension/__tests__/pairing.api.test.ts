import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { seedVerifiedUser, accessTokenForUser } from '@/test-utils/fixtures.js';
import { ExtensionPairingService } from '@/modules/extension/services/pairing.service.js';

vi.mock('@/modules/extension/services/pairing.service.js', () => ({
  ExtensionPairingService: {
    startPairing: vi.fn(),
    redeemPairingCode: vi.fn(),
    listDevices: vi.fn(),
    revokeDevice: vi.fn(),
  },
}));

describe('Extension Pairing API', () => {
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    const user = await seedVerifiedUser({ email: 'extension_pairing_test@example.com' });
    userId = user.id.toString();
    userToken = accessTokenForUser(user);
  });

  let pairingCode = '';

  describe('POST /api/v1/extension/pair/start', () => {
    it('generates a 6-digit pairing code', async () => {
      vi.mocked(ExtensionPairingService.startPairing).mockResolvedValue({
        code: '123456',
        expiresAt: new Date(Date.now() + 300000)
      });

      const response = await request(app)
        .post('/api/v1/extension/pair/start')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      expect(response.body.data.pairingCode).toBeDefined();
      expect(response.body.data.pairingCode.length).toBe(6);
      expect(response.body.data.expiresAt).toBeDefined();
      pairingCode = response.body.data.pairingCode;
    });

    it('requires authentication', async () => {
      await request(app)
        .post('/api/v1/extension/pair/start')
        .expect(401);
    });
  });

  describe('POST /api/v1/extension/pair/complete', () => {
    it('redeems a valid code for tokens', async () => {
      vi.mocked(ExtensionPairingService.redeemPairingCode).mockResolvedValue({
        accessToken: 'mock-access',
        refreshToken: 'mock-refresh',
        expiresInSeconds: 3600
      });

      const response = await request(app)
        .post('/api/v1/extension/pair/complete')
        .send({ pairingCode })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.expiresInSeconds).toBeDefined();
    });

    it('rejects an invalid code', async () => {
      await request(app)
        .post('/api/v1/extension/pair/complete')
        .send({ pairingCode: 'INVALID' })
        .expect(400); // Because schema validation is length 6
    });
  });

  describe('GET /api/v1/extension/devices', () => {
    it('lists paired devices', async () => {
      vi.mocked(ExtensionPairingService.listDevices).mockResolvedValue([
        {
          id: 1,
          userId,
          userAgent: 'Test Agent',
          ipAddress: '127.0.0.1',
          lastSeenAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          sessionId: 'mock-session-id'
        }
      ]);

      const response = await request(app)
        .get('/api/v1/extension/devices')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].id).toBeDefined();
    });
  });

  describe('DELETE /api/v1/extension/devices/:id', () => {
    it('revokes a paired device', async () => {
      vi.mocked(ExtensionPairingService.revokeDevice).mockResolvedValue(undefined);

      await request(app)
        .delete(`/api/v1/extension/devices/1`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(204);
    });
  });
});
