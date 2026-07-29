import bcrypt from "bcrypt";
import { authRepository } from "@/modules/auth/repositories/auth.repository.js";
import { AppError } from "@/shared/utils/errors/AppError.js";
import { generateAccessToken, generateRefreshToken } from "@/modules/auth/utils/token.utils.js";
import { SigninInput } from "@/modules/auth/types/auth.types.js";
import { cacheService, CacheKeys, CacheTTL } from "@/infrastructure/cache/index.js";
import {
  messageBus,
  MessageExchanges,
  MessageRoutingKeys,
} from "@/infrastructure/messaging/index.js";

export const signinService = async ({ email, password }: SigninInput) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await authRepository.findUserByEmail(normalizedEmail);
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("Your account is disabled.", 403);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await authRepository.updateRefreshToken(user.id, refreshToken);

  const { passwordHash: _hash, refreshToken: _token, ...userData } = user;

  // Cache user session in the caching layer (Redis / Memory)
  await cacheService.set(
    CacheKeys.AUTH.USER_SESSION(user.id),
    userData,
    CacheTTL.SEVEN_DAYS
  );

  // Clear any cached failed login attempts upon successful signin
  await cacheService.delete(CacheKeys.AUTH.FAILED_ATTEMPTS(normalizedEmail));

  // Publish user signin event to RabbitMQ message bus (non-blocking)
  messageBus
    .publish(MessageExchanges.DOMAIN_EVENTS, MessageRoutingKeys.AUTH_SIGNIN, {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    })
    .catch((err) =>
      console.error("[AuthService] Failed to publish signin event:", err)
    );

  return {
    accessToken,
    refreshToken,
    data: userData,
  };
};

export default {
  signinService,
};
