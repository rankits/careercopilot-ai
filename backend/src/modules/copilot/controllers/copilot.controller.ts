import type { Request, Response } from 'express';

import { copilotService } from '@/modules/copilot/services/copilot.service.js';
import { copilotChatSchema } from '@/modules/copilot/validations/copilot.schema.js';
import { catchAsync } from '@/shared/utils/catchAsync.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { successResponse } from '@/shared/utils/response.js';

const requireUserPrincipalId = (req: Request): string => {
  const principalId = req.user?.principalId;
  if (principalId == null || req.user?.principalType !== 'USER') {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  return String(principalId);
};

export const chatController = catchAsync(async (req: Request, res: Response) => {
  const userId = requireUserPrincipalId(req);
  const input = copilotChatSchema.shape.body.parse(req.body);
  const result = await copilotService.chat(userId, input);

  return res.status(200).json(
    successResponse('Career Copilot reply generated', {
      reply: result.reply,
    }),
  );
});
