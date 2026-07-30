import express from "express";
import {
  changePasswordController,
  forgotPasswordController,
  loginController,
  logoutAllController,
  logoutController,
  meController,
  refreshController,
  registerController,
  requestLoginOtpController,
  resendOtpController,
  resetPasswordController,
  verifyLoginOtpController,
  verifyRegistrationOtpController,
} from "@/modules/auth/controllers/auth.controller.js";
import { authMiddleware } from "@/shared/middlewares/auth.middleware.js";
import { validateResource } from "@/shared/middlewares/validateResource.js";
import { authRateLimiter, otpRateLimiter } from "@/shared/middlewares/rateLimiter.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginOtpRequestSchema,
  loginOtpVerifySchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyRegistrationOtpSchema,
} from "@/modules/auth/validations/auth.schema.js";

const router = express.Router();

// --- Registration & email verification ---
router.post("/register", otpRateLimiter, validateResource(registerSchema), registerController);
router.post("/otp/resend", otpRateLimiter, validateResource(resendOtpSchema), resendOtpController);
router.post(
  "/otp/verify-registration",
  authRateLimiter,
  validateResource(verifyRegistrationOtpSchema),
  verifyRegistrationOtpController,
);

// --- Login (password & OTP) ---
router.post("/login", authRateLimiter, validateResource(loginSchema), loginController);
router.post(
  "/login/otp/request",
  otpRateLimiter,
  validateResource(loginOtpRequestSchema),
  requestLoginOtpController,
);
router.post(
  "/login/otp/verify",
  authRateLimiter,
  validateResource(loginOtpVerifySchema),
  verifyLoginOtpController,
);

// --- Forgot / reset password ---
router.post(
  "/forgot-password",
  otpRateLimiter,
  validateResource(forgotPasswordSchema),
  forgotPasswordController,
);
router.post(
  "/reset-password",
  authRateLimiter,
  validateResource(resetPasswordSchema),
  resetPasswordController,
);

// --- Session lifecycle ---
router.post(
  "/refresh-token",
  authRateLimiter,
  validateResource(refreshTokenSchema),
  refreshController,
);
router.post("/logout", validateResource(logoutSchema), logoutController);
router.post("/logout-all", authMiddleware, logoutAllController);

// --- Authenticated self-service ---
router.post(
  "/change-password",
  authMiddleware,
  validateResource(changePasswordSchema),
  changePasswordController,
);
router.get("/me", authMiddleware, meController);

export default router;
