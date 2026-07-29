import jwt from "jsonwebtoken";
import { TokenPayload } from "@/modules/auth/types/auth.types.js";

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "default_access_secret_for_development_change_in_production";
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "default_refresh_secret_for_development_change_in_production";

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: "15m",
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: "7d",
  });
};
