import { NextFunction, Request, Response } from "express";
import { signinService } from "@/modules/auth/services/auth.service.js";
import { REFRESH_TOKEN_COOKIE_KEY } from "@/modules/auth/constants/auth.constant.js";
import { refreshCookieOptions } from "@/modules/auth/config/cookies.conf.js";
import { successResponse } from "@/shared/utils/response.js";

export const signinController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await signinService(req.body);

    const { refreshToken, accessToken, data } = result;

    res.cookie(REFRESH_TOKEN_COOKIE_KEY, refreshToken, refreshCookieOptions);

    return res.status(200).json({
      ...successResponse("User logged in successfully", data),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  signinController,
};
