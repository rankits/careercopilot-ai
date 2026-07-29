import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { resumeConfig } from '@/modules/resumes/config/resume.config.js';
import { resumeService } from '@/modules/resumes/services/resume.service.js';
import { successResponse } from '@/shared/utils/response.js';

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
      userId: typeof req.body.userId === 'string' ? req.body.userId : undefined,
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
    const status = await resumeService.getResumeStatus(String(req.params.resumeId));
    return res.status(200).json(successResponse('Resume status retrieved', status));
  } catch (error) {
    return next(error);
  }
};

export const getParsedDataController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedData = await resumeService.getParsedData(String(req.params.resumeId));
    return res.status(200).json(successResponse('Resume parsed data retrieved', parsedData));
  } catch (error) {
    return next(error);
  }
};

export const getParseStatusController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseStatus = await resumeService.getParseStatus(String(req.params.resumeId));
    return res.status(200).json(successResponse('Resume parse status retrieved', parseStatus));
  } catch (error) {
    return next(error);
  }
};

export const startParseController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await resumeService.startParse(String(req.params.resumeId));
    return res.status(202).json(successResponse('Resume parsing queued', result));
  } catch (error) {
    return next(error);
  }
};

export const reparseResumeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await resumeService.reparseResume(String(req.params.resumeId), req.body?.reason);
    return res.status(202).json(successResponse('Resume reparse queued', result));
  } catch (error) {
    return next(error);
  }
};

export const confirmProfileController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await resumeService.confirmProfile({
      userId: String(req.params.userId),
      resumeId: req.body.resumeId,
    });
    return res.status(200).json(successResponse('Candidate profile confirmed', profile));
  } catch (error) {
    return next(error);
  }
};
