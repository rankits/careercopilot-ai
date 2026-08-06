import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const methods: Record<string, ReturnType<typeof vi.fn>> = {};
  const names = [
    'createApplication',
    'savePlatformJob',
    'unsavePlatformJob',
    'getApplications',
    'getApplicationById',
    'updateApplication',
    'transitionStatus',
    'archiveApplication',
    'unarchiveApplication',
    'deleteApplication',
    'addNote',
    'deleteNote',
    'addTask',
    'updateTask',
    'deleteTask',
  ];
  for (const name of names) methods[name] = vi.fn();
  return { svc: methods };
});

vi.mock('@/modules/application-management/repositories/prisma-application.repository.js', () => ({
  PrismaApplicationRepository: class {},
}));

vi.mock('@/modules/application-management/services/application.service.js', () => ({
  ApplicationManagementService: class {
    constructor() {
      return h.svc as never;
    }
  },
}));

vi.mock('@/shared/utils/response.js', () => ({
  successResponse: (message: string, data?: unknown) => ({ message, data }),
}));

import * as controller from '@/modules/application-management/controllers/application.controller.js';

const next = vi.fn();

const makeRes = () => {
  const res = {
    status: vi.fn(function () {
      return this as unknown;
    }),
    json: vi.fn(),
  } as unknown as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  return res;
};

const userReq = (
  overrides: Record<string, unknown> = {},
  user = { principalType: 'USER', principalId: 'u-1' },
) => ({ user, params: {}, body: {}, query: {}, ...overrides }) as never;

beforeEach(() => {
  next.mockReset();
  Object.values(h.svc).forEach((fn) => fn.mockReset());
});

describe('application.controller', () => {
  it('createApplication: 201 with a user', async () => {
    const res = makeRes();
    h.svc.createApplication.mockResolvedValue({ id: 'a' });
    await controller.createApplicationController(
      userReq({ body: { jobTitle: 'T' } }),
      res as never,
      next as never,
    );
    expect(h.svc.createApplication).toHaveBeenCalledWith('u-1', { jobTitle: 'T' });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('savePlatformJob: 201 when newly created, 200 when already saved', async () => {
    const res = makeRes();
    h.svc.savePlatformJob.mockResolvedValue({ application: { id: 'a' }, created: true });
    await controller.savePlatformJobController(
      userReq({ body: { jobId: 'j-1' } }),
      res as never,
      next as never,
    );
    expect(res.status).toHaveBeenCalledWith(201);

    res.status.mockClear();
    h.svc.savePlatformJob.mockResolvedValue({ application: { id: 'a' }, created: false });
    await controller.savePlatformJobController(
      userReq({ body: { jobId: 'j-1' } }),
      res as never,
      next as never,
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('unsavePlatformJob: 200 with a jobId param', async () => {
    const res = makeRes();
    h.svc.unsavePlatformJob.mockResolvedValue(undefined);
    await controller.unsavePlatformJobController(
      userReq({ params: { jobId: 'j-1' } }),
      res as never,
      next as never,
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getApplications: splits comma-separated status filter', async () => {
    const res = makeRes();
    h.svc.getApplications.mockResolvedValue({ items: [] });
    await controller.getApplicationsController(
      userReq({ query: { status: 'APPLIED,INTERVIEW', page: '1', limit: '10' } }),
      res as never,
      next as never,
    );
    expect(h.svc.getApplications).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ status: ['APPLIED', 'INTERVIEW'] }),
      }),
    );
  });

  it('getApplications: array status query', async () => {
    const res = makeRes();
    h.svc.getApplications.mockResolvedValue({ items: [] });
    await controller.getApplicationsController(
      userReq({ query: { status: ['SAVED', 'APPLIED'] } }),
      res as never,
      next as never,
    );
    expect(h.svc.getApplications).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ status: ['SAVED', 'APPLIED'] }),
      }),
    );
  });

  it('routes to next when authentication is missing', async () => {
    const res = makeRes();
    // no req.user
    await controller.getApplicationsController(
      { user: undefined, query: {} } as never,
      res as never,
      next as never,
    );
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }),
    );
  });

  it('forbids non-user principals', async () => {
    const res = makeRes();
    await controller.getApplicationsController(
      { user: { principalType: 'ADMIN', principalId: 1 }, query: {} } as never,
      res as never,
      next as never,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('throws a 400 when a required param is missing', async () => {
    const res = makeRes();
    h.svc.getApplicationById.mockResolvedValue({});
    await controller.getApplicationByIdController(
      userReq({ params: {} }),
      res as never,
      next as never,
    );
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, code: 'BAD_REQUEST' }),
    );
  });

  it('covers remaining handlers on the happy path', async () => {
    h.svc.getApplicationById.mockResolvedValue({ id: 'a' });
    h.svc.updateApplication.mockResolvedValue({ id: 'a' });
    h.svc.transitionStatus.mockResolvedValue({ id: 'a' });
    h.svc.archiveApplication.mockResolvedValue({});
    h.svc.unarchiveApplication.mockResolvedValue({});
    h.svc.deleteApplication.mockResolvedValue(undefined);
    h.svc.addNote.mockResolvedValue({ id: 'n' });
    h.svc.deleteNote.mockResolvedValue(undefined);
    h.svc.addTask.mockResolvedValue({ id: 't' });
    h.svc.updateTask.mockResolvedValue({ id: 't' });
    h.svc.deleteTask.mockResolvedValue(undefined);

    const res = makeRes();
    const base = userReq({ params: { id: 'a', noteId: 'n', taskId: 't' } });
    await controller.getApplicationByIdController(base, res as never, next as never);
    await controller.updateApplicationController(base, res as never, next as never);
    await controller.transitionStatusController(base, res as never, next as never);
    await controller.archiveApplicationController(base, res as never, next as never);
    await controller.unarchiveApplicationController(base, res as never, next as never);
    await controller.deleteApplicationController(base, res as never, next as never);
    await controller.addNoteController(base, res as never, next as never);
    await controller.deleteNoteController(base, res as never, next as never);
    await controller.addTaskController(base, res as never, next as never);
    await controller.updateTaskController(base, res as never, next as never);
    await controller.deleteTaskController(base, res as never, next as never);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });

  it('forwards service errors to next', async () => {
    const res = makeRes();
    const boom = new Error('db down');
    h.svc.updateTask.mockRejectedValue(boom);
    await controller.updateTaskController(
      userReq({ params: { id: 'a', taskId: 't' } }),
      res as never,
      next as never,
    );
    expect(next).toHaveBeenCalledWith(boom);
  });

  it('getParam accepts an array param and uses the first value', async () => {
    const res = makeRes();
    h.svc.getApplicationById.mockResolvedValue({ id: 'a' });
    await controller.getApplicationByIdController(
      userReq({ params: { id: ['a', 'b'] } }),
      res as never,
      next as never,
    );
    expect(h.svc.getApplicationById).toHaveBeenCalledWith('u-1', 'a');
  });

  it('getApplications forwards a validation error to next for bad query', async () => {
    const res = makeRes();
    await controller.getApplicationsController(
      userReq({ query: { page: 'not-a-number', limit: '-5' } }),
      res as never,
      next as never,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'ZodError' }));
  });

  it('getApplications passes an undefined status when none is supplied', async () => {
    const res = makeRes();
    h.svc.getApplications.mockResolvedValue({ items: [] });
    await controller.getApplicationsController(
      userReq({ query: { page: '1', limit: '10' } }),
      res as never,
      next as never,
    );
    expect(h.svc.getApplications).toHaveBeenCalledWith(
      expect.objectContaining({ filters: expect.objectContaining({ status: undefined }) }),
    );
  });

  it('savePlatformJob defaults an empty jobId', async () => {
    const res = makeRes();
    h.svc.savePlatformJob.mockResolvedValue({ application: {}, created: true });
    await controller.savePlatformJobController(userReq({ body: {} }), res as never, next as never);
    expect(h.svc.savePlatformJob).toHaveBeenCalledWith('u-1', '');
  });
});
