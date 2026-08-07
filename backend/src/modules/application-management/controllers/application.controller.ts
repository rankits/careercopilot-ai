import { NextFunction, Request, Response } from 'express';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { successResponse } from '@/shared/utils/response.js';
import { ApplicationManagementService } from '@/modules/application-management/services/application.service.js';
import { PrismaApplicationRepository } from '@/modules/application-management/repositories/prisma-application.repository.js';
import { ApplicationStatus, ApplicationPriority, ApplicationSourceType } from '@prisma/client';
import { ListApplicationsQuerySchema } from '@/modules/application-management/validations/application.validation.js';

const repository = new PrismaApplicationRepository();
export const applicationService = new ApplicationManagementService(repository);

function requireUserPrincipalId(req: Request): string {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  if (req.user.principalType !== 'USER') {
    throw new AppError('Applications are available only to user accounts', 403, 'FORBIDDEN');
  }
  return String(req.user.principalId);
}

function getParam(param: string | string[] | undefined, name: string): string {
  if (typeof param === 'string') return param;
  if (Array.isArray(param) && param.length > 0) return param[0];
  throw new AppError(`Missing required parameter: ${name}`, 400, 'BAD_REQUEST');
}

export const createApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const application = await applicationService.createApplication(userId, req.body);
    return res.status(201).json(successResponse('Application created successfully', application));
  } catch (error) {
    return next(error);
  }
};

export const savePlatformJobController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const jobId = String(req.body?.jobId ?? '');
    const { application, created } = await applicationService.savePlatformJob(userId, jobId);
    return res
      .status(created ? 201 : 200)
      .json(successResponse(created ? 'Job saved successfully' : 'Job already saved', application));
  } catch (error) {
    return next(error);
  }
};

export const unsavePlatformJobController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const jobId = getParam(req.params.jobId, 'jobId');
    await applicationService.unsavePlatformJob(userId, jobId);
    return res.status(200).json(successResponse('Job unsaved successfully'));
  } catch (error) {
    return next(error);
  }
};

export const getApplicationsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const query = ListApplicationsQuerySchema.parse(req.query);

    let statusFilter: ApplicationStatus | ApplicationStatus[] | undefined;
    if (query.status) {
      if (Array.isArray(query.status)) {
        statusFilter = query.status as ApplicationStatus[];
      } else {
        statusFilter = query.status.split(',') as ApplicationStatus[];
      }
    }

    let sourceTypeFilter: ApplicationSourceType | ApplicationSourceType[] | undefined;
    if (query.sourceType) {
      const raw = Array.isArray(query.sourceType) ? query.sourceType : query.sourceType.split(',');
      sourceTypeFilter =
        raw.length === 1 ? (raw[0] as ApplicationSourceType) : (raw as ApplicationSourceType[]);
    }

    const result = await applicationService.getApplications({
      userId,
      filters: {
        status: statusFilter,
        archived: query.archived,
        search: query.search,
        sourceType: sourceTypeFilter,
      },
      pagination: { page: query.page, limit: query.limit },
      sortBy: query.sortBy,
    });

    return res.status(200).json(successResponse('Applications fetched successfully', result));
  } catch (error) {
    return next(error);
  }
};

export const getApplicationByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const application = await applicationService.getApplicationById(userId, id);
    return res.status(200).json(successResponse('Application fetched successfully', application));
  } catch (error) {
    return next(error);
  }
};

export const updateApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const application = await applicationService.updateApplication(userId, id, req.body);
    return res.status(200).json(successResponse('Application updated successfully', application));
  } catch (error) {
    return next(error);
  }
};

export const transitionStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const application = await applicationService.transitionStatus(userId, id, req.body);
    return res
      .status(200)
      .json(successResponse('Application status transitioned successfully', application));
  } catch (error) {
    return next(error);
  }
};

export const archiveApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const application = await applicationService.archiveApplication(userId, id);
    return res.status(200).json(successResponse('Application archived successfully', application));
  } catch (error) {
    return next(error);
  }
};

export const unarchiveApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const application = await applicationService.unarchiveApplication(userId, id);
    return res
      .status(200)
      .json(successResponse('Application unarchived successfully', application));
  } catch (error) {
    return next(error);
  }
};

export const deleteApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    await applicationService.deleteApplication(userId, id);
    return res.status(200).json(successResponse('Application deleted successfully'));
  } catch (error) {
    return next(error);
  }
};

export const addNoteController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const note = await applicationService.addNote(userId, id, req.body);
    return res.status(201).json(successResponse('Note added successfully', note));
  } catch (error) {
    return next(error);
  }
};

export const deleteNoteController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const noteId = getParam(req.params.noteId, 'noteId');
    await applicationService.deleteNote(userId, id, noteId);
    return res.status(200).json(successResponse('Note deleted successfully'));
  } catch (error) {
    return next(error);
  }
};

export const addTaskController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const task = await applicationService.addTask(userId, id, req.body);
    return res.status(201).json(successResponse('Task added successfully', task));
  } catch (error) {
    return next(error);
  }
};

export const updateTaskController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const taskId = getParam(req.params.taskId, 'taskId');
    const task = await applicationService.updateTask(userId, id, taskId, req.body);
    return res.status(200).json(successResponse('Task updated successfully', task));
  } catch (error) {
    return next(error);
  }
};

export const deleteTaskController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const taskId = getParam(req.params.taskId, 'taskId');
    await applicationService.deleteTask(userId, id, taskId);
    return res.status(200).json(successResponse('Task deleted successfully'));
  } catch (error) {
    return next(error);
  }
};
