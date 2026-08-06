import { beforeEach, describe, expect, it } from 'vitest';
import '@/test-utils/prisma-mock.js';
import { PrismaApplicationRepository } from '@/modules/application-management/repositories/prisma-application.repository.js';
import { fakeDb } from '@/test-utils/prisma-mock.js';
import { resetTestState } from '@/test-utils/reset.js';
import {
  ApplicationStatus,
  ApplicationSourceType,
  StatusChangedBy,
  NoteType,
  TaskType,
  TaskStatus,
} from '@prisma/client';

const repo = new PrismaApplicationRepository();
const USER = 'user-repo-1';

beforeEach(async () => {
  await resetTestState();
});

describe('PrismaApplicationRepository', () => {
  describe('create', () => {
    it('creates an application with a source and default history note', async () => {
      const dto = await repo.create(
        {
          userId: USER,
          jobId: 'job-1',
          companyId: 'comp-1',
          jobTitle: 'Backend Engineer',
          companyName: 'Acme Corp',
          salaryMin: 100000,
          salaryMax: 140000,
          currentStatus: ApplicationStatus.APPLIED,
          appliedAt: new Date('2025-05-08T00:00:00.000Z'),
          primarySourceType: 'EXTERNAL_JOB_URL',
        },
        {
          sourceType: 'EXTERNAL_JOB_URL',
          externalUrl: 'https://acme.com/jobs/1',
        },
        'Manually created application',
      );

      expect(dto.id).toBeTruthy();
      expect(dto.userId).toBe(USER);
      expect(dto.salaryMin).toBe('100000');
      expect(dto.salaryMax).toBe('140000');
      expect(dto.currentStatus).toBe(ApplicationStatus.APPLIED);
      expect(dto.appliedAt).toBe('2025-05-08T00:00:00.000Z');
      expect(fakeDb.applicationSources).toHaveLength(1);
      expect(fakeDb.applicationStatusHistories).toHaveLength(1);
      expect(fakeDb.applicationStatusHistories[0].note).toBe('Manually created application');
    });

    it('creates an application without a source and defaults status to SAVED', async () => {
      const dto = await repo.create({
        userId: USER,
        jobTitle: 'Frontend Engineer',
        companyName: 'Beta Inc',
      });

      expect(dto.currentStatus).toBe(ApplicationStatus.SAVED);
      expect(dto.salaryMin).toBeNull();
      expect(dto.jobId).toBeNull();
      expect(fakeDb.applicationSources).toHaveLength(0);
      expect(fakeDb.applications).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('returns a hydrated detail DTO with history, notes and tasks', async () => {
      const app = fakeDb.seedApplication({
        userId: USER,
        salaryMin: 90000,
        currentStatus: 'APPLIED',
      });
      fakeDb.applicationStatusHistories.push({
        id: 'hist-1',
        applicationId: app.id,
        fromStatus: null,
        toStatus: 'SAVED',
        changedAt: new Date('2025-05-01T00:00:00.000Z'),
        changedBy: 'USER',
        note: 'Tracked',
      });
      fakeDb.applicationNotes.push({
        id: 'note-1',
        applicationId: app.id,
        type: 'GENERAL',
        content: 'Great fit',
        createdAt: new Date('2025-05-02T00:00:00.000Z'),
        updatedAt: new Date('2025-05-02T00:00:00.000Z'),
      });
      fakeDb.applicationTasks.push({
        id: 'task-1',
        applicationId: app.id,
        title: 'Follow up',
        description: null,
        type: 'FOLLOW_UP',
        dueAt: new Date('2025-05-10T00:00:00.000Z'),
        completedAt: null,
        status: 'PENDING',
        createdAt: new Date('2025-05-01T00:00:00.000Z'),
        updatedAt: new Date('2025-05-01T00:00:00.000Z'),
      });

      const detail = await repo.findById(USER, app.id);

      expect(detail).not.toBeNull();
      expect(detail!.id).toBe(app.id);
      expect(detail!.statusHistory).toHaveLength(1);
      expect(detail!.statusHistory[0].note).toBe('Tracked');
      expect(detail!.notes).toHaveLength(1);
      expect(detail!.notes[0].content).toBe('Great fit');
      expect(detail!.tasks).toHaveLength(1);
      expect(detail!.tasks[0].title).toBe('Follow up');
    });

    it('returns null when the application does not exist', async () => {
      const detail = await repo.findById(USER, 'missing');
      expect(detail).toBeNull();
    });

    it('covers null scalar mapping for timestamps and salary', async () => {
      const app = fakeDb.seedApplication({
        userId: USER,
        salaryMin: 80,
        salaryMax: null,
        appliedAt: null,
        firstResponseAt: null,
        closedAt: null,
        archivedAt: null,
        currentStatus: 'SAVED',
      });
      const detail = await repo.findById(USER, app.id);
      expect(detail).not.toBeNull();
    });
  });

  describe('findByJobId', () => {
    it('returns a matching application for userId + jobId', async () => {
      const app = fakeDb.seedApplication({
        userId: USER,
        jobId: 'job-9',
        salaryMin: 12,
        salaryMax: 20,
      });
      const found = await repo.findByJobId(USER, 'job-9');
      expect(found?.id).toBe(app.id);
    });

    it('returns null when jobId is not found', async () => {
      const found = await repo.findByJobId(USER, 'nope');
      expect(found).toBeNull();
    });
  });

  describe('findByNormalisedUrl', () => {
    it('returns a matching application for the normalised URL', async () => {
      const app = fakeDb.seedApplication({
        userId: USER,
        normalisedJobUrl: 'https://acme.com/jobs/1',
        salaryMin: 10,
        salaryMax: 11,
      });
      const found = await repo.findByNormalisedUrl(USER, 'https://acme.com/jobs/1');
      // ApplicationDto has no normalisedJobUrl field - assert on the matched id.
      expect(found?.id).toBe(app.id);
    });

    it('returns null when the normalised url is not found', async () => {
      const found = await repo.findByNormalisedUrl(USER, 'https://nowhere.com');
      expect(found).toBeNull();
    });
  });

  describe('list', () => {
    beforeEach(() => {
      fakeDb.seedApplication({
        userId: USER,
        jobTitle: 'Saved Role',
        companyName: 'Alpha Co',
        currentStatus: 'SAVED',
      });
      fakeDb.seedApplication({
        userId: USER,
        jobTitle: 'Applied Role',
        companyName: 'Beta Co',
        currentStatus: 'APPLIED',
      });
      fakeDb.seedApplication({
        userId: USER,
        jobTitle: 'Interview Role',
        companyName: 'Gamma Co',
        currentStatus: 'INTERVIEW',
      });
      fakeDb.seedApplication({
        userId: USER,
        jobTitle: 'Archived Role',
        companyName: 'Delta Co',
        currentStatus: 'REJECTED',
        archivedAt: new Date('2025-01-01T00:00:00.000Z'),
      });
    });

    it('supports a single status filter and pagination', async () => {
      const res = await repo.list({
        userId: USER,
        filters: { status: 'APPLIED' },
        pagination: { page: 1, limit: 10 },
        sortBy: 'updatedAt:desc',
      });
      expect(res.pagination.totalItems).toBe(1);
      expect(res.items[0].jobTitle).toBe('Applied Role');
      expect(res.pagination.hasPreviousPage).toBe(false);
      expect(res.pagination.hasNextPage).toBe(false);
    });

    it('supports an array status filter', async () => {
      const res = await repo.list({
        userId: USER,
        filters: { status: ['SAVED', 'INTERVIEW'] },
        pagination: { page: 1, limit: 10 },
        sortBy: 'createdAt:asc',
      });
      expect(res.pagination.totalItems).toBe(2);
    });

    it('excludes SAVED when no status filter is supplied', async () => {
      const res = await repo.list({
        userId: USER,
        filters: {},
        pagination: { page: 1, limit: 10 },
        sortBy: 'updatedAt:desc',
      });
      // SAVED is excluded, and the archived REJECTED row is also filtered
      // out by the archivedAt=null default, leaving APPLIED + INTERVIEW.
      expect(res.pagination.totalItems).toBe(2);
    });

    it('filters archived truthy, falsy and searchable items', async () => {
      const archived = await repo.list({
        userId: USER,
        filters: { archived: 'true' },
        pagination: { page: 1, limit: 10 },
        sortBy: 'updatedAt:desc',
      });
      expect(archived.pagination.totalItems).toBe(1);

      const active = await repo.list({
        userId: USER,
        filters: { archived: 'false' },
        pagination: { page: 1, limit: 10 },
        sortBy: 'updatedAt:desc',
      });
      // archived:false -> archivedAt = null, so the archived REJECTED and
      // the SAVED row are both excluded -> APPLIED + INTERVIEW.
      expect(active.pagination.totalItems).toBe(2);

      const searched = await repo.list({
        userId: USER,
        filters: { search: 'gamma' },
        pagination: { page: 1, limit: 10 },
        sortBy: 'updatedAt:desc',
      });
      expect(searched.pagination.totalItems).toBe(1);
    });

    it('computes pagination totals, hasNextPage and empty-list totalPages', async () => {
      const res = await repo.list({
        userId: USER,
        filters: {},
        pagination: { page: 1, limit: 2 },
        sortBy: 'updatedAt:desc',
      });
      expect(res.items).toHaveLength(2);
      // 2 apps / page-size 2 => one page, so no next page.
      expect(res.pagination.totalPages).toBe(1);
      expect(res.pagination.hasNextPage).toBe(false);

      const empty = await repo.list({
        userId: 'no-apps-user',
        filters: {},
        pagination: { page: 1, limit: 10 },
        sortBy: 'updatedAt:desc',
      });
      expect(empty.pagination.totalItems).toBe(0);
      expect(empty.pagination.totalPages).toBe(1);
    });

    it('sorts by companyName ascending across pages', async () => {
      const res = await repo.list({
        userId: USER,
        filters: {},
        pagination: { page: 1, limit: 1 },
        sortBy: 'companyName:asc',
      });
      // SAVED is excluded from list, so Alpha Co (Saved Role) is filtered
      // out and the first remaining sort hit is Beta Co / Applied Role.
      expect(res.items[0].jobTitle).toBe('Applied Role');
    });
  });

  describe('update', () => {
    it('updates an application and maps it to a DTO', async () => {
      const app = fakeDb.seedApplication({ userId: USER, salaryMin: 5, salaryMax: 6 });
      const dto = await repo.update(USER, app.id, { currentStatus: 'OFFER' });
      expect(dto.currentStatus).toBe('OFFER');
    });
  });

  describe('delete', () => {
    it('returns true when an application is deleted', async () => {
      const app = fakeDb.seedApplication({ userId: USER });
      expect(await repo.delete(USER, app.id)).toBe(true);
    });

    it('returns false when no application matches', async () => {
      expect(await repo.delete(USER, 'missing')).toBe(false);
    });
  });

  describe('addStatusHistory', () => {
    it('creates and maps a status history entry', async () => {
      const history = await repo.addStatusHistory(USER, 'app-1', {
        fromStatus: ApplicationStatus.SAVED,
        toStatus: ApplicationStatus.INTERVIEW,
        changedBy: StatusChangedBy.USER,
        note: 'Moving on',
      });
      expect(history.applicationId).toBe('app-1');
      expect(history.toStatus).toBe(ApplicationStatus.INTERVIEW);
      expect(history.note).toBe('Moving on');
    });
  });

  describe('addNote', () => {
    it('throws APPLICATION_NOT_FOUND when parent is not owned', async () => {
      await expect(repo.addNote(USER, 'missing', NoteType.GENERAL, 'hello')).rejects.toThrow(
        'APPLICATION_NOT_FOUND',
      );
    });

    it('adds a note to an owned application', async () => {
      const app = fakeDb.seedApplication({ userId: USER });
      const note = await repo.addNote(USER, app.id, NoteType.GENERAL, 'hello world');
      expect(note.content).toBe('hello world');
    });
  });

  describe('deleteNote', () => {
    it('returns true when the note is deleted', async () => {
      const app = fakeDb.seedApplication({ userId: USER });
      const note = await repo.addNote(USER, app.id, NoteType.GENERAL, 'x');
      expect(await repo.deleteNote(USER, app.id, note.id)).toBe(true);
    });

    it('returns false when the note is not found', async () =>
      expect(await repo.deleteNote(USER, 'app1', 'note999')).toBe(false));
  });

  describe('addTask', () => {
    it('maps a created task and validates ownership DTO', async () => {
      const app = fakeDb.seedApplication({ userId: USER });
      const task = await repo.addTask(USER, app.id, {
        title: 'Prepare',
        type: TaskType.FOLLOW_UP,
      });
      expect(task.title).toBe('Prepare');
      expect(task.status).toBe('PENDING');
    });

    it('throws when application parent is missing', async () => {
      await expect(
        repo.addTask(USER, 'missing', { title: 'X', type: TaskType.FOLLOW_UP }),
      ).rejects.toThrow('APPLICATION_NOT_FOUND');
    });
  });

  describe('updateTask', () => {
    it('updates a task and maps it back to dto', async () => {
      const app = fakeDb.seedApplication({ userId: USER });
      const created = await repo.addTask(USER, app.id, {
        title: 'Title',
        type: TaskType.FOLLOW_UP,
        dueAt: new Date('2025-06-01'),
      });
      const updated = await repo.updateTask(USER, app.id, created.id, {
        status: TaskStatus.COMPLETED,
        completedAt: new Date('2025-06-02T00:00:00.000Z'),
      });
      expect(updated.status).toBe(TaskStatus.COMPLETED);
    });

    it('throws TASK_NOT_FOUND when task is missing', async () => {
      await expect(repo.updateTask(USER, 'app1', 'taskmissing', { title: 'X' })).rejects.toThrow(
        'TASK_NOT_FOUND',
      );
    });
  });
});
