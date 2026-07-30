import { NextFunction, Request, Response } from 'express';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { successResponse } from '@/shared/utils/response.js';
import { ApplicationManagementService } from '@/modules/application-management/services/application.service.js';
import { PrismaApplicationRepository } from '@/modules/application-management/repositories/prisma-application.repository.js';
import { ApplicationStatus, ApplicationPriority } from '@prisma/client';
import { ApplicationSortBy } from '@/modules/application-management/types/application.types.js';

const repository = new PrismaApplicationRepository();
export const applicationService = new ApplicationManagementService(repository);

function getUserId(req: Request): string {
  const userId =
    (req as any).user?.id ||
    req.header('x-user-id') ||
    (typeof req.body?.userId === 'string' ? req.body.userId : undefined) ||
    (typeof req.query?.userId === 'string' ? req.query.userId : undefined);

  if (!userId) {
    throw new AppError('Unauthorized: User ID is required', 401, 'UNAUTHORIZED');
  }
  return userId;
}

function getParam(param: string | string[] | undefined, name: string): string {
  if (typeof param === 'string') return param;
  if (Array.isArray(param) && param.length > 0) return param[0];
  throw new AppError(`Missing required parameter: ${name}`, 400, 'BAD_REQUEST');
}

export const createApplicationController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const application = await applicationService.createApplication(userId, req.body);
    return res.status(201).json(successResponse('Application created successfully', application));
  } catch (error) {
    return next(error);
  }
};

export const getApplicationsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) || '20', 10)));
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const archived = req.query.archived as 'true' | 'false' | 'all' | undefined;
    const sortBy = (req.query.sortBy as ApplicationSortBy) || 'updatedAt:desc';

    let statusFilter: ApplicationStatus | ApplicationStatus[] | undefined;
    if (req.query.status) {
      if (Array.isArray(req.query.status)) {
        statusFilter = req.query.status as ApplicationStatus[];
      } else if (typeof req.query.status === 'string') {
        statusFilter = req.query.status.split(',') as ApplicationStatus[];
      }
    }

    const result = await applicationService.getApplications({
      userId,
      filters: {
        status: statusFilter,
        archived,
        search,
      },
      pagination: { page, limit },
      sortBy,
    });

    return res.status(200).json(successResponse('Applications fetched successfully', result));
  } catch (error) {
    return next(error);
  }
};

export const getApplicationByIdController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const id = getParam(req.params.id, 'id');
    const application = await applicationService.getApplicationById(userId, id);
    return res.status(200).json(successResponse('Application fetched successfully', application));
  } catch (error) {
    return next(error);
  }
};

export const updateApplicationController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const id = getParam(req.params.id, 'id');
    const application = await applicationService.updateApplication(userId, id, req.body);
    return res.status(200).json(successResponse('Application updated successfully', application));
  } catch (error) {
    return next(error);
  }
};

export const transitionStatusController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const id = getParam(req.params.id, 'id');
    const application = await applicationService.transitionStatus(userId, id, req.body);
    return res.status(200).json(successResponse('Application status transitioned successfully', application));
  } catch (error) {
    return next(error);
  }
};

export const archiveApplicationController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const id = getParam(req.params.id, 'id');
    const application = await applicationService.archiveApplication(userId, id);
    return res.status(200).json(successResponse('Application archived successfully', application));
  } catch (error) {
    return next(error);
  }
};

export const unarchiveApplicationController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const id = getParam(req.params.id, 'id');
    const application = await applicationService.unarchiveApplication(userId, id);
    return res.status(200).json(successResponse('Application unarchived successfully', application));
  } catch (error) {
    return next(error);
  }
};

export const deleteApplicationController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const id = getParam(req.params.id, 'id');
    await applicationService.deleteApplication(userId, id);
    return res.status(200).json(successResponse('Application deleted successfully'));
  } catch (error) {
    return next(error);
  }
};

export const addNoteController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const id = getParam(req.params.id, 'id');
    const note = await applicationService.addNote(userId, id, req.body);
    return res.status(201).json(successResponse('Note added successfully', note));
  } catch (error) {
    return next(error);
  }
};

export const deleteNoteController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
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
    const userId = getUserId(req);
    const id = getParam(req.params.id, 'id');
    const task = await applicationService.addTask(userId, id, req.body);
    return res.status(201).json(successResponse('Task added successfully', task));
  } catch (error) {
    return next(error);
  }
};

export const updateTaskController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
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
    const userId = getUserId(req);
    const id = getParam(req.params.id, 'id');
    const taskId = getParam(req.params.taskId, 'taskId');
    await applicationService.deleteTask(userId, id, taskId);
    return res.status(200).json(successResponse('Task deleted successfully'));
  } catch (error) {
    return next(error);
  }
};
