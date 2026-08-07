import {
  Prisma,
  ApplicationStatus,
  StatusChangedBy,
  NoteType,
  TaskType,
  TaskStatus,
  Application,
  ApplicationStatusHistory,
  ApplicationNote,
  ApplicationTask,
} from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { IApplicationRepository } from '@/modules/application-management/contracts/application.repository.js';
import {
  ApplicationDto,
  ApplicationDetailDto,
  ApplicationListOptions,
  PaginatedApplicationResult,
  ApplicationStatusHistoryDto,
  ApplicationNoteDto,
  ApplicationTaskDto,
} from '@/modules/application-management/types/application.types.js';

export class PrismaApplicationRepository implements IApplicationRepository {
  private mapToDto(app: Application): ApplicationDto {
    return {
      id: app.id,
      userId: app.userId,
      jobId: app.jobId,
      companyId: app.companyId,
      jobTitle: app.jobTitle,
      companyName: app.companyName,
      companyLogoUrl: app.companyLogoUrl,
      originalJobUrl: app.originalJobUrl,
      location: app.location,
      remoteType: app.remoteType,
      employmentType: app.employmentType,
      salaryMin: app.salaryMin ? app.salaryMin.toString() : null,
      salaryMax: app.salaryMax ? app.salaryMax.toString() : null,
      salaryCurrency: app.salaryCurrency,
      salaryPeriod: app.salaryPeriod,
      currentStatus: app.currentStatus,
      primarySourceType: app.primarySourceType,
      priority: app.priority,
      interestLevel: app.interestLevel,
      appliedAt: app.appliedAt ? app.appliedAt.toISOString() : null,
      firstResponseAt: app.firstResponseAt ? app.firstResponseAt.toISOString() : null,
      closedAt: app.closedAt ? app.closedAt.toISOString() : null,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      archivedAt: app.archivedAt ? app.archivedAt.toISOString() : null,
    };
  }

  private mapHistoryToDto(history: ApplicationStatusHistory): ApplicationStatusHistoryDto {
    return {
      id: history.id,
      applicationId: history.applicationId,
      fromStatus: history.fromStatus,
      toStatus: history.toStatus,
      changedAt: history.changedAt,
      changedBy: history.changedBy,
      note: history.note,
    };
  }

  private mapNoteToDto(note: ApplicationNote): ApplicationNoteDto {
    return {
      id: note.id,
      applicationId: note.applicationId,
      type: note.type,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }

  private mapTaskToDto(task: ApplicationTask): ApplicationTaskDto {
    return {
      id: task.id,
      applicationId: task.applicationId,
      title: task.title,
      description: task.description,
      type: task.type,
      dueAt: task.dueAt,
      completedAt: task.completedAt,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  async create(
    data: Prisma.ApplicationUncheckedCreateInput,
    source?: Prisma.ApplicationSourceUncheckedCreateWithoutApplicationInput,
    initialHistoryNote?: string,
  ): Promise<ApplicationDto> {
    const created = await prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          ...data,
          sources: source ? { create: [source] } : undefined,
          statusHistory: {
            create: [
              {
                fromStatus: null,
                toStatus: data.currentStatus || ApplicationStatus.SAVED,
                changedBy: StatusChangedBy.USER,
                note: initialHistoryNote || 'Application tracked',
              },
            ],
          },
        },
      });
      return app;
    });

    return this.mapToDto(created);
  }

  async findById(userId: string, applicationId: string): Promise<ApplicationDetailDto | null> {
    const app = await prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: {
        statusHistory: { orderBy: { changedAt: 'asc' } },
        notes: { orderBy: { createdAt: 'desc' } },
        tasks: { orderBy: [{ status: 'asc' }, { dueAt: 'asc' }] },
      },
    });

    if (!app) {
      return null;
    }

    const baseDto = this.mapToDto(app);

    return {
      ...baseDto,
      descriptionSnapshot: app.descriptionSnapshot,
      skillsSnapshot: app.skillsSnapshot,
      statusHistory: app.statusHistory.map((h) => this.mapHistoryToDto(h)),
      notes: app.notes.map((n) => this.mapNoteToDto(n)),
      tasks: app.tasks.map((t) => this.mapTaskToDto(t)),
    };
  }

  async findByJobId(userId: string, jobId: string): Promise<ApplicationDto | null> {
    const app = await prisma.application.findFirst({
      where: { userId, jobId },
    });
    return app ? this.mapToDto(app) : null;
  }

  async findByNormalisedUrl(
    userId: string,
    normalisedJobUrl: string,
  ): Promise<ApplicationDto | null> {
    const app = await prisma.application.findFirst({
      where: { userId, normalisedJobUrl },
    });
    return app ? this.mapToDto(app) : null;
  }

  async findSavedJobIds(userId: string, jobIds: string[]): Promise<string[]> {
    if (jobIds.length === 0) {
      return [];
    }

    const saved = await prisma.application.findMany({
      where: {
        userId,
        jobId: { in: jobIds },
        currentStatus: ApplicationStatus.SAVED,
        archivedAt: null,
      },
      select: { jobId: true },
    });

    return saved
      .map((row) => row.jobId)
      .filter((jobId): jobId is string => typeof jobId === 'string' && jobId.length > 0);
  }

  async list(options: ApplicationListOptions): Promise<PaginatedApplicationResult<ApplicationDto>> {
    const { userId, filters, pagination, sortBy } = options;
    const where: Prisma.ApplicationWhereInput = { userId };

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.currentStatus = { in: filters.status };
      } else {
        where.currentStatus = filters.status;
      }
    } else {
      // Saved Jobs live on /saved-jobs — keep them out of Application Management lists.
      where.currentStatus = { not: ApplicationStatus.SAVED };
    }

    if (filters.archived === 'true') {
      where.archivedAt = { not: null };
    } else if (filters.archived === 'false' || !filters.archived) {
      where.archivedAt = null;
    }

    if (filters.search) {
      where.OR = [
        { companyName: { contains: filters.search, mode: 'insensitive' } },
        { jobTitle: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.sourceType) {
      if (Array.isArray(filters.sourceType)) {
        where.primarySourceType = { in: filters.sourceType };
      } else {
        where.primarySourceType = filters.sourceType;
      }
    }

    const [field, direction] = sortBy.split(':') as [string, 'asc' | 'desc'];
    const orderBy: Prisma.ApplicationOrderByWithRelationInput[] =
      field === 'priority'
        ? [{ priority: direction }, { updatedAt: 'desc' }]
        : field === 'appliedAt'
          ? [{ appliedAt: { sort: direction, nulls: 'last' } }, { createdAt: direction }]
          : [{ [field]: direction }];

    const skip = (pagination.page - 1) * pagination.limit;

    const [totalItems, items] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        orderBy,
        skip,
        take: pagination.limit,
      }),
    ]);

    const totalPages = Math.ceil(totalItems / pagination.limit) || 1;

    return {
      items: items.map((app) => this.mapToDto(app)),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalItems,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPreviousPage: pagination.page > 1,
      },
    };
  }

  async update(
    userId: string,
    applicationId: string,
    data: Prisma.ApplicationUncheckedUpdateInput,
  ): Promise<ApplicationDto> {
    const updated = await prisma.application.update({
      where: { id: applicationId, userId },
      data,
    });
    return this.mapToDto(updated);
  }

  async delete(userId: string, applicationId: string): Promise<boolean> {
    const result = await prisma.application.deleteMany({
      where: { id: applicationId, userId },
    });
    return result.count > 0;
  }

  async addStatusHistory(
    userId: string,
    applicationId: string,
    data: {
      fromStatus: ApplicationStatus | null;
      toStatus: ApplicationStatus;
      changedBy: StatusChangedBy;
      note?: string;
    },
  ): Promise<ApplicationStatusHistoryDto> {
    const history = await prisma.applicationStatusHistory.create({
      data: {
        applicationId,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        changedBy: data.changedBy,
        note: data.note,
      },
    });
    return this.mapHistoryToDto(history);
  }

  async addNote(
    userId: string,
    applicationId: string,
    type: NoteType,
    content: string,
  ): Promise<ApplicationNoteDto> {
    // Verify parent ownership first
    const exists = await prisma.application.findFirst({
      where: { id: applicationId, userId },
      select: { id: true },
    });
    if (!exists) {
      throw new Error('APPLICATION_NOT_FOUND');
    }

    const note = await prisma.applicationNote.create({
      data: {
        applicationId,
        type,
        content,
      },
    });
    return this.mapNoteToDto(note);
  }

  async deleteNote(userId: string, applicationId: string, noteId: string): Promise<boolean> {
    const deleted = await prisma.applicationNote.deleteMany({
      where: {
        id: noteId,
        applicationId,
        application: { userId },
      },
    });
    return deleted.count > 0;
  }

  async addTask(
    userId: string,
    applicationId: string,
    data: {
      title: string;
      description?: string;
      type: TaskType;
      dueAt?: Date;
    },
  ): Promise<ApplicationTaskDto> {
    // Verify parent ownership first
    const exists = await prisma.application.findFirst({
      where: { id: applicationId, userId },
      select: { id: true },
    });
    if (!exists) {
      throw new Error('APPLICATION_NOT_FOUND');
    }

    const task = await prisma.applicationTask.create({
      data: {
        applicationId,
        title: data.title,
        description: data.description,
        type: data.type,
        dueAt: data.dueAt,
      },
    });
    return this.mapTaskToDto(task);
  }

  async updateTask(
    userId: string,
    applicationId: string,
    taskId: string,
    data: Partial<{
      title: string;
      description: string | null;
      type: TaskType;
      dueAt: Date | null;
      status: TaskStatus;
      completedAt: Date | null;
    }>,
  ): Promise<ApplicationTaskDto> {
    // Verify ownership
    const taskExists = await prisma.applicationTask.findFirst({
      where: {
        id: taskId,
        applicationId,
        application: { userId },
      },
    });
    if (!taskExists) {
      throw new Error('TASK_NOT_FOUND');
    }

    const updated = await prisma.applicationTask.update({
      where: { id: taskId },
      data,
    });
    return this.mapTaskToDto(updated);
  }

  async deleteTask(userId: string, applicationId: string, taskId: string): Promise<boolean> {
    const deleted = await prisma.applicationTask.deleteMany({
      where: {
        id: taskId,
        applicationId,
        application: { userId },
      },
    });
    return deleted.count > 0;
  }
}
