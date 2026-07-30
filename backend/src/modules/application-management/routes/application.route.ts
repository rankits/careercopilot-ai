import express from 'express';
import { z } from 'zod';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import {
  createApplicationController,
  getApplicationsController,
  getApplicationByIdController,
  updateApplicationController,
  transitionStatusController,
  archiveApplicationController,
  unarchiveApplicationController,
  deleteApplicationController,
  addNoteController,
  deleteNoteController,
  addTaskController,
  updateTaskController,
  deleteTaskController,
} from '@/modules/application-management/controllers/application.controller.js';
import {
  CreateApplicationSchema,
  UpdateApplicationSchema,
  StatusTransitionSchema,
  CreateNoteSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
} from '@/modules/application-management/validations/application.validation.js';

const router = express.Router();

// Application Root CRUD & Listing
router.post(
  '/',
  validateResource(
    z.object({
      body: CreateApplicationSchema,
    })
  ),
  createApplicationController
);

router.get('/', getApplicationsController);

router.get('/:id', getApplicationByIdController);

router.patch(
  '/:id',
  validateResource(
    z.object({
      body: UpdateApplicationSchema,
    })
  ),
  updateApplicationController
);

router.delete('/:id', deleteApplicationController);

// Lifecycle Transitions & Archiving
router.post(
  '/:id/status-transitions',
  validateResource(
    z.object({
      body: StatusTransitionSchema,
    })
  ),
  transitionStatusController
);

router.post('/:id/archive', archiveApplicationController);
router.post('/:id/unarchive', unarchiveApplicationController);

// Notes Sub-resource
router.post(
  '/:id/notes',
  validateResource(
    z.object({
      body: CreateNoteSchema,
    })
  ),
  addNoteController
);
router.delete('/:id/notes/:noteId', deleteNoteController);

// Tasks Sub-resource
router.post(
  '/:id/tasks',
  validateResource(
    z.object({
      body: CreateTaskSchema,
    })
  ),
  addTaskController
);

router.patch(
  '/:id/tasks/:taskId',
  validateResource(
    z.object({
      body: UpdateTaskSchema,
    })
  ),
  updateTaskController
);

router.delete('/:id/tasks/:taskId', deleteTaskController);

export default router;
