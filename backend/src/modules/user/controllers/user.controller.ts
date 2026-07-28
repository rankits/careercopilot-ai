import { Request, Response } from "express";
import * as userService from "../services/user.service.js";
import { AppError } from "../../../shared/utils/errors/AppError.js";
import { catchAsync } from "../../../shared/utils/catchAsync.js";
import { successResponse } from "../../../shared/utils/response.js";
import { toPaginatedUsersResponse, toUserProfileResponse } from "../utils/user.mapper.js";
import { listUsersQuerySchema } from "../validations/user.schema.js";
import type { RequestContext } from "../types/user.types.js";

const requirePrincipalId = (req: Request): string => {
  if (!req.user) throw new AppError("Authentication required", 401);
  return req.user.principalId;
};

const getRequestContext = (req: Request): RequestContext => ({
  ipAddress: req.ip,
  userAgent: req.headers["user-agent"],
});

export const meController = catchAsync(async (req: Request, res: Response) => {
  const profile = await userService.getMyProfile(requirePrincipalId(req));
  return res.status(200).json(successResponse("Profile fetched", toUserProfileResponse(profile)));
});

export const updateMeController = catchAsync(async (req: Request, res: Response) => {
  const profile = await userService.updateMyProfile(
    requirePrincipalId(req),
    req.body,
    getRequestContext(req),
  );
  return res.status(200).json(successResponse("Profile updated", toUserProfileResponse(profile)));
});

export const listUsersController = catchAsync(async (req: Request, res: Response) => {
  // `validateResource` already guaranteed this parses; re-run to get the
  // coerced/defaulted query values (see shared/middlewares/validateResource.ts).
  const query = listUsersQuerySchema.shape.query.parse(req.query);
  const result = await userService.listUsers(query);
  return res.status(200).json(successResponse("Users fetched", toPaginatedUsersResponse(result)));
});

export default { meController, updateMeController, listUsersController };
