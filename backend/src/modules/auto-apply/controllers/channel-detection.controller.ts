import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { ChannelDetectionService } from '@/modules/auto-apply/services/channel-detection.service.js';
import { PrismaChannelDetectionJobLookup } from '@/modules/auto-apply/repositories/prisma-channel-detection.lookup.js';
import { requireUserPrincipalId, getParam } from '@/modules/auto-apply/utils/require-user.util.js';

export const channelDetectionService = new ChannelDetectionService(
  new PrismaChannelDetectionJobLookup(),
);

export const detectChannelController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireUserPrincipalId(req);
    const jobId = getParam(req.params.jobId, 'jobId');
    const result = await channelDetectionService.detectChannel(jobId);
    return res.status(200).json(successResponse('Channel detected', result));
  } catch (error) {
    return next(error);
  }
};
