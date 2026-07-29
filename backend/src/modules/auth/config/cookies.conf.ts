import { CookieOptions } from "express";
import { REFRESH_TOKEN_EXPIRES_IN_MS } from "@/modules/auth/constants/auth.constant.js";

export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: REFRESH_TOKEN_EXPIRES_IN_MS,
  path: "/",
};

/** Same attributes minus `maxAge` - required for `res.clearCookie` to match the cookie it's clearing. */
export const clearRefreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};
