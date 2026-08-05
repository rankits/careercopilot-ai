import { NextFunction, Request, Response } from 'express';
import { resumeAnalysisService } from '@/modules/resume-analysis/services/resume-analysis.service.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { successResponse } from '@/shared/utils/response.js';

const requirePrincipalId = (req: Request): string => {
  if (!req.user) throw new AppError('Authentication required', 401);
  return String(req.user.principalId);
};

export const startAnalysisController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requirePrincipalId(req);
    const { targetRole, experienceLevel, jobDescription } = req.body as {
      targetRole: string;
      experienceLevel: string;
      jobDescription?: string;
    };

    const result = await resumeAnalysisService.startAnalysis(
      {
        resumeId: String(req.params.resumeId),
        targetRole,
        experienceLevel,
        jobDescription,
      },
      userId,
    );

    return res.status(202).json(successResponse('Analysis started', result));
  } catch (error) {
    return next(error);
  }
};

export const getAnalysisController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requirePrincipalId(req);
    // Polling must never receive a stale 304 — status flips ANALYZING → COMPLETED.
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.removeHeader('ETag');
    const analysis = await resumeAnalysisService.getAnalysis(String(req.params.resumeId), userId);
    if (!analysis) {
      return res.status(200).json(successResponse('No analysis yet', null));
    }
    return res.status(200).json(successResponse('Analysis retrieved', analysis));
  } catch (error) {
    return next(error);
  }
};

export const updateStepController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requirePrincipalId(req);
    const updated = await resumeAnalysisService.updateStep(
      String(req.params.resumeId),
      (req.body as { step: number }).step,
      userId,
    );
    if (!updated) {
      return res.status(200).json(successResponse('No analysis yet', null));
    }
    return res.status(200).json(successResponse('Step updated', updated));
  } catch (error) {
    return next(error);
  }
};

export const getKeywordsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requirePrincipalId(req);
    const keywords = await resumeAnalysisService.getKeywords(String(req.params.resumeId), userId);
    return res.status(200).json(successResponse('Keywords retrieved', keywords));
  } catch (error) {
    return next(error);
  }
};

export const getSuggestionsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requirePrincipalId(req);
    const suggestions = await resumeAnalysisService.getSuggestions(
      String(req.params.resumeId),
      userId,
    );
    return res.status(200).json(successResponse('Suggestions retrieved', suggestions));
  } catch (error) {
    return next(error);
  }
};

export const applySuggestionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requirePrincipalId(req);
    const preserveContent = Boolean(
      (req.body as { preserveContent?: boolean } | undefined)?.preserveContent,
    );
    const result = await resumeAnalysisService.applySuggestion(
      String(req.params.resumeId),
      Number(req.params.suggestionId),
      userId,
      { preserveContent },
    );
    return res.status(200).json(successResponse('Suggestion applied', result));
  } catch (error) {
    return next(error);
  }
};

export const ignoreSuggestionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requirePrincipalId(req);
    const result = await resumeAnalysisService.ignoreSuggestion(
      String(req.params.resumeId),
      Number(req.params.suggestionId),
      userId,
    );
    return res.status(200).json(successResponse('Suggestion ignored', result));
  } catch (error) {
    return next(error);
  }
};

export const updateContentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requirePrincipalId(req);
    const result = await resumeAnalysisService.updateContent(
      String(req.params.resumeId),
      (req.body as { content: string }).content,
      userId,
    );
    return res.status(200).json(successResponse('Content updated', result));
  } catch (error) {
    return next(error);
  }
};

export const recheckAtsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requirePrincipalId(req);
    const result = await resumeAnalysisService.recheckAts(String(req.params.resumeId), userId);
    return res.status(200).json(successResponse('ATS rechecked', result));
  } catch (error) {
    return next(error);
  }
};

export const saveVersionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requirePrincipalId(req);
    const body = req.body as { label: string; content?: string };
    const version = await resumeAnalysisService.saveVersion(
      String(req.params.resumeId),
      body.label,
      userId,
      body.content,
    );
    return res.status(201).json(successResponse('Version saved', version));
  } catch (error) {
    return next(error);
  }
};

export const getVersionsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requirePrincipalId(req);
    const versions = await resumeAnalysisService.getVersions(String(req.params.resumeId), userId);
    return res.status(200).json(successResponse('Versions retrieved', versions));
  } catch (error) {
    return next(error);
  }
};

export const listSavedVersionsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requirePrincipalId(req);
    const versions = await resumeAnalysisService.listSavedVersions(userId);
    return res.status(200).json(successResponse('Saved resumes retrieved', versions));
  } catch (error) {
    return next(error);
  }
};

export const getSavedVersionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requirePrincipalId(req);
    const version = await resumeAnalysisService.getSavedVersion(
      Number(req.params.versionId),
      userId,
    );
    return res.status(200).json(successResponse('Saved resume retrieved', version));
  } catch (error) {
    return next(error);
  }
};

export const deleteSavedVersionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requirePrincipalId(req);
    const result = await resumeAnalysisService.deleteSavedVersion(
      Number(req.params.versionId),
      userId,
    );
    return res.status(200).json(successResponse('Saved resume deleted', result));
  } catch (error) {
    return next(error);
  }
};

export const exportResumeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requirePrincipalId(req);
    const format = (req.query.format as 'pdf' | 'docx' | 'txt') ?? 'txt';
    const result = await resumeAnalysisService.exportResume(
      String(req.params.resumeId),
      format,
      userId,
    );
    return res.status(200).json(successResponse('Export ready', result));
  } catch (error) {
    return next(error);
  }
};
