import { OAuth2Client } from 'google-auth-library';

import { env } from '@/shared/config/env.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

export interface GoogleLoginIdentity {
  googleSub: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatarUrl?: string;
}

export class GoogleLoginAdapter {
  private readonly client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(
      env.GOOGLE_OAUTH_CLIENT_ID,
      env.GOOGLE_OAUTH_CLIENT_SECRET,
      env.GOOGLE_LOGIN_REDIRECT_URI,
    );
  }

  createAuthorizationUrl(input: { state: string; codeChallenge: string }): string {
    if (
      !env.GOOGLE_OAUTH_CLIENT_ID ||
      !env.GOOGLE_OAUTH_CLIENT_SECRET ||
      !env.GOOGLE_LOGIN_REDIRECT_URI
    ) {
      throw new AppError(
        'Google login is not properly configured',
        500,
        'GOOGLE_LOGIN_NOT_CONFIGURED',
      );
    }

    const scopes = env.GOOGLE_LOGIN_SCOPES.split(',')
      .map((scope) => scope.trim())
      .filter(Boolean);

    return this.client.generateAuthUrl({
      access_type: 'online',
      scope: scopes,
      state: input.state,
      include_granted_scopes: false,
      prompt: 'select_account',
      code_challenge: input.codeChallenge,
      code_challenge_method: 'S256',
    });
  }

  async exchangeAuthorizationCode(input: {
    code: string;
    codeVerifier: string;
  }): Promise<GoogleLoginIdentity> {
    try {
      const { tokens } = await this.client.getToken({
        code: input.code,
        codeVerifier: input.codeVerifier,
      });

      if (!tokens.id_token) {
        throw new AppError('No ID token returned by Google', 400, 'GOOGLE_LOGIN_IDENTITY_INVALID');
      }

      const ticket = await this.client.verifyIdToken({
        idToken: tokens.id_token,
        audience: env.GOOGLE_OAUTH_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) {
        throw new AppError('Invalid Google ID token', 400, 'GOOGLE_LOGIN_IDENTITY_INVALID');
      }
      if (!payload.email) {
        throw new AppError(
          'Google account email is required',
          400,
          'GOOGLE_LOGIN_IDENTITY_INVALID',
        );
      }
      if (payload.email_verified === false) {
        throw new AppError('Google email is not verified', 400, 'GOOGLE_LOGIN_EMAIL_NOT_VERIFIED');
      }

      const given = payload.given_name?.trim();
      const family = payload.family_name?.trim();
      const display = payload.name?.trim();
      const firstName = given || display?.split(/\s+/)[0] || 'Google';
      const lastName =
        family || (display && display.split(/\s+/).slice(1).join(' ').trim()) || 'User';

      return {
        googleSub: payload.sub,
        email: payload.email.toLowerCase(),
        emailVerified: true,
        firstName: firstName.slice(0, 80),
        lastName: lastName.slice(0, 80),
        displayName: display,
        avatarUrl: payload.picture,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to exchange authorization code with Google',
        502,
        'GOOGLE_LOGIN_CODE_EXCHANGE_FAILED',
      );
    }
  }
}

export const googleLoginAdapter = new GoogleLoginAdapter();
