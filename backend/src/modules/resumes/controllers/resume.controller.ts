import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { resumeConfig } from '@/modules/resumes/config/resume.config.js';
import { resumeService } from '@/modules/resumes/services/resume.service.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { successResponse } from '@/shared/utils/response.js';

const requirePrincipalId = (req: Request): string => {
  if (!req.user) throw new AppError('Authentication required', 401);
  return String(req.user.principalId);
};

export const resumeUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: resumeConfig.maxFileSizeBytes,
    files: 1,
  },
}).single('resume');

export const uploadResumeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resume = await resumeService.uploadResume({
      file: req.file,
      userId: requirePrincipalId(req),
    });

    return res.status(201).json(
      successResponse('Resume uploaded successfully', {
        id: resume.id,
        status: resume.status,
        fileName: resume.fileName,
        storageDriver: resume.storageDriver,
        uploadedAt: resume.uploadedAt,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

export const getResumeStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const status = await resumeService.getResumeStatus(
      String(req.params.resumeId),
      requirePrincipalId(req),
    );
    return res.status(200).json(successResponse('Resume status retrieved', status));
  } catch (error) {
    return next(error);
  }
};

export const getParsedDataController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedData = await resumeService.getParsedData(
      String(req.params.resumeId),
      requirePrincipalId(req),
    );
    return res.status(200).json(successResponse('Resume parsed data retrieved', parsedData));
  } catch (error) {
    return next(error);
  }
};

export const getParseStatusController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseStatus = await resumeService.getParseStatus(
      String(req.params.resumeId),
      requirePrincipalId(req),
    );
    return res.status(200).json(successResponse('Resume parse status retrieved', parseStatus));
  } catch (error) {
    return next(error);
  }
};

export const startParseController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await resumeService.startParse(
      String(req.params.resumeId),
      requirePrincipalId(req),
    );
    return res.status(202).json(successResponse('Resume parsing queued', result));
  } catch (error) {
    return next(error);
  }
};

export const reparseResumeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await resumeService.reparseResume(
      String(req.params.resumeId),
      requirePrincipalId(req),
      req.body?.reason,
    );
    return res.status(202).json(successResponse('Resume reparse queued', result));
  } catch (error) {
    return next(error);
  }
};

export const getCandidateProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const principalId = requirePrincipalId(req);
    const requestedUserId = String(req.params.userId);
    if (requestedUserId !== principalId) {
      throw new AppError('You do not have access to this profile', 403, 'PROFILE_ACCESS_DENIED');
    }
    const profile = await resumeService.getCandidateProfile(requestedUserId);
    return res.status(200).json(successResponse('Candidate profile retrieved', profile));
  } catch (error) {
    return next(error);
  }
};

export const confirmProfileController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const principalId = requirePrincipalId(req);
    const requestedUserId = String(req.params.userId);
    if (requestedUserId !== principalId) {
      throw new AppError('You can only confirm your own profile', 403, 'PROFILE_ACCESS_DENIED');
    }
    await resumeService.confirmProfile({
      userId: principalId,
      resumeId: req.body.resumeId,
    });
    return res.status(200).json(successResponse('Profile created successfully'));
  } catch (error) {
    return next(error);
  }
};

export const getMyCandidateProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const profile = await resumeService.getCandidateProfile(requirePrincipalId(req));
    return res.status(200).json(successResponse('Candidate profile retrieved', profile));
  } catch (error) {
    return next(error);
  }
};

export const updateMyCandidateProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requirePrincipalId(req);
    const profile = await resumeService.updateCandidateProfile(userId, req.body);
    return res.status(200).json(successResponse('Candidate profile updated', profile));
  } catch (error) {
    return next(error);
  }
};
