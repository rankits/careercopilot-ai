import bcrypt from "bcrypt";
import { authRepository } from "../repositories/auth.repository.js";
import { AppError } from "../../../shared/utils/errors/AppError.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.utils.js";
import { SigninInput } from "../types/auth.types.js";

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

  return {
    accessToken,
    refreshToken,
    data: userData,
  };
};

export default {
  signinService,
};
