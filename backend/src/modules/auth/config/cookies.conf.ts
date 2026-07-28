import { CookieOptions } from "express";
import { REFRESH_TOKEN_EXPIRES_IN_MS } from "../constants/auth.constant.js";

export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: REFRESH_TOKEN_EXPIRES_IN_MS,
  path: "/",
};
