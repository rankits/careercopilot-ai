import {
  ApplicationStatus,
  ApplicationSourceType,
  ApplicationPriority,
  StatusChangedBy,
  SalaryPeriod,
  TaskStatus,
} from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { IApplicationManagementService } from '@/modules/application-management/contracts/application.contract.js';
import { IApplicationRepository } from '@/modules/application-management/contracts/application.repository.js';
import {
  ApplicationListOptions,
  PaginatedApplicationResult,
  ApplicationDto,
  ApplicationDetailDto,
  ApplicationNoteDto,
  ApplicationTaskDto,
} from '@/modules/application-management/types/application.types.js';
import {
  CreateApplicationInput,
  UpdateApplicationInput,
  StatusTransitionInput,
  CreateNoteInput,
  CreateTaskInput,
  UpdateTaskInput,
} from '@/modules/application-management/validations/application.validation.js';
import { normalizeJobUrl } from '@/modules/application-management/utils/url-normalizer.js';
import {
  parseAppliedAtDate,
  resolveAppliedAt,
} from '@/modules/application-management/utils/applied-at.util.js';

export class ApplicationManagementService implements IApplicationManagementService {
  constructor(private readonly repository: IApplicationRepository) {}

  async createApplication(userId: string, input: CreateApplicationInput): Promise<ApplicationDto> {
    if (input.sourceType === 'PLATFORM_JOB' || input.sourceType === 'PLATFORM_APPLY') {
      const existing = await this.repository.findByJobId(userId, input.jobId);
      if (existing) {
        throw new AppError(
          'You are already tracking this job opportunity.',
          409,
          'APPLICATION_EXISTS',
          {
            existingApplicationId: existing.id,
          },
        );
      }

      const job = await prisma.job.findUnique({
        where: { id: input.jobId },
        include: { company: true },
      });

      if (!job) {
        throw new AppError('The referenced job listing does not exist.', 404, 'JOB_NOT_FOUND');
      }

      const initialStatus = input.currentStatus || ApplicationStatus.SAVED;

      return this.repository.create(
        {
          userId,
          jobId: job.id,
          companyId: job.company?.id || null,
          jobTitle: job.title,
          companyName: job.company?.name || job.companySlug,
          companyLogoUrl: job.company?.logoUrl || null,
          salaryMin: job.salaryMin !== null && job.salaryMin !== undefined ? job.salaryMin : null,
          salaryMax: job.salaryMax !== null && job.salaryMax !== undefined ? job.salaryMax : null,
          salaryCurrency: job.currency || null,
          salaryPeriod: SalaryPeriod.YEAR,
          descriptionSnapshot: job.descriptionText || job.descriptionHtml || null,
          skillsSnapshot: Array.isArray(job.skills) ? (job.skills as string[]) : [],
          currentStatus: initialStatus,
          primarySourceType:
            input.sourceType === 'PLATFORM_APPLY'
              ? ApplicationSourceType.PLATFORM_APPLY
              : ApplicationSourceType.PLATFORM_JOB,
          priority: input.priority || ApplicationPriority.MEDIUM,
          appliedAt: resolveAppliedAt(input.appliedAt, input.currentStatus),
        },
        {
          sourceType:
            input.sourceType === 'PLATFORM_APPLY'
              ? ApplicationSourceType.PLATFORM_APPLY
              : ApplicationSourceType.PLATFORM_JOB,
          externalId: job.id,
        },
        input.sourceType === 'PLATFORM_APPLY'
          ? 'Applied via platform'
          : 'Tracked from platform job catalog',
      );
    }

    if (input.sourceType === 'EXTERNAL_JOB_URL') {
      const normalisedUrl = normalizeJobUrl(input.originalJobUrl);
      if (normalisedUrl) {
        const existing = await this.repository.findByNormalisedUrl(userId, normalisedUrl);
        if (existing) {
          throw new AppError(
            'You are already tracking an application for this job URL.',
            409,
            'APPLICATION_EXISTS',
            {
              existingApplicationId: existing.id,
            },
          );
        }
      }

      return this.repository.create(
        {
          userId,
          jobTitle: input.jobTitle,
          companyName: input.companyName,
          originalJobUrl: input.originalJobUrl,
          normalisedJobUrl: normalisedUrl,
          location: input.location || null,
          salaryMin: input.salaryMin || null,
          salaryMax: input.salaryMax || null,
          salaryCurrency: input.salaryCurrency || null,
          salaryPeriod: input.salaryPeriod || SalaryPeriod.YEAR,
          currentStatus: input.currentStatus || ApplicationStatus.SAVED,
          primarySourceType: ApplicationSourceType.EXTERNAL_JOB_URL,
          priority: input.priority || ApplicationPriority.MEDIUM,
          appliedAt: resolveAppliedAt(input.appliedAt, input.currentStatus),
        },
        {
          sourceType: ApplicationSourceType.EXTERNAL_JOB_URL,
          externalUrl: input.originalJobUrl,
        },
        'Tracked from external job URL',
      );
    }

    if (input.sourceType === 'MANUAL') {
      const normalisedUrl = normalizeJobUrl(input.originalJobUrl);

      return this.repository.create(
        {
          userId,
          jobTitle: input.jobTitle,
          companyName: input.companyName,
          originalJobUrl: input.originalJobUrl || null,
          normalisedJobUrl: normalisedUrl || null,
          location: input.location || null,
          salaryMin: input.salaryMin || null,
          salaryMax: input.salaryMax || null,
          salaryCurrency: input.salaryCurrency || null,
          salaryPeriod: input.salaryPeriod || SalaryPeriod.YEAR,
          currentStatus: input.currentStatus || ApplicationStatus.SAVED,
          primarySourceType: ApplicationSourceType.MANUAL,
          priority: input.priority || ApplicationPriority.MEDIUM,
          appliedAt: resolveAppliedAt(input.appliedAt, input.currentStatus),
        },
        {
          sourceType: ApplicationSourceType.MANUAL,
          externalUrl: input.originalJobUrl || null,
        },
        'Manually created application',
      );
    }

    throw new AppError('Unsupported application source type', 400, 'UNSUPPORTED_SOURCE_TYPE');
  }

  async getApplications(
    options: ApplicationListOptions,
  ): Promise<PaginatedApplicationResult<ApplicationDto>> {
    return this.repository.list(options);
  }

  async getApplicationById(
    userId: string,
    applicationId: string,
  ): Promise<ApplicationDetailDto | null> {
    const app = await this.repository.findById(userId, applicationId);
    if (!app) {
      throw new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    return app;
  }

  async updateApplication(
    userId: string,
    applicationId: string,
    input: UpdateApplicationInput,
  ): Promise<ApplicationDto> {
    const exists = await this.repository.findById(userId, applicationId);
    if (!exists) {
      throw new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }

    const { appliedAt, ...rest } = input;

    return this.repository.update(userId, applicationId, {
      ...rest,
      ...(appliedAt !== undefined && {
        appliedAt: appliedAt === null ? null : parseAppliedAtDate(appliedAt),
      }),
    });
  }

  async transitionStatus(
    userId: string,
    applicationId: string,
    input: StatusTransitionInput,
  ): Promise<ApplicationDto> {
    const app = await this.repository.findById(userId, applicationId);
    if (!app) {
      throw new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }

    if (app.currentStatus === input.toStatus) {
      return app;
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {
      currentStatus: input.toStatus,
    };

    // Populate appliedAt automatically when reaching APPLIED for the first time
    if (input.toStatus === ApplicationStatus.APPLIED && !app.appliedAt) {
      updateData.appliedAt = now;
    }

    // Populate firstResponseAt automatically when reaching any screening/interview stage
    const responseStages: ApplicationStatus[] = [
      ApplicationStatus.SCREENING,
      ApplicationStatus.INTERVIEW,
      ApplicationStatus.ASSESSMENT,
      ApplicationStatus.OFFER,
    ];
    if (responseStages.includes(input.toStatus) && !app.firstResponseAt) {
      updateData.firstResponseAt = now;
      if (!app.appliedAt) {
        updateData.appliedAt = now;
      }
    }

    // Populate closedAt automatically when reaching a terminal stage
    const terminalStages: ApplicationStatus[] = [
      ApplicationStatus.HIRED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
      ApplicationStatus.GHOSTED,
      ApplicationStatus.EXPIRED,
    ];
    if (terminalStages.includes(input.toStatus) && !app.closedAt) {
      updateData.closedAt = now;
    }

    await this.repository.addStatusHistory(userId, applicationId, {
      fromStatus: app.currentStatus,
      toStatus: input.toStatus,
      changedBy: StatusChangedBy.USER,
      note: input.note,
    });

    return this.repository.update(userId, applicationId, updateData);
  }

  async archiveApplication(userId: string, applicationId: string): Promise<ApplicationDto> {
    const app = await this.repository.findById(userId, applicationId);
    if (!app) {
      throw new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    return this.repository.update(userId, applicationId, { archivedAt: new Date() });
  }

  async unarchiveApplication(userId: string, applicationId: string): Promise<ApplicationDto> {
    const app = await this.repository.findById(userId, applicationId);
    if (!app) {
      throw new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    return this.repository.update(userId, applicationId, { archivedAt: null });
  }

  async deleteApplication(userId: string, applicationId: string): Promise<boolean> {
    const success = await this.repository.delete(userId, applicationId);
    if (!success) {
      throw new AppError('Application not found or access denied', 404, 'APPLICATION_NOT_FOUND');
    }
    return true;
  }

  async addNote(
    userId: string,
    applicationId: string,
    input: CreateNoteInput,
  ): Promise<ApplicationNoteDto> {
    const app = await this.repository.findById(userId, applicationId);
    if (!app) {
      throw new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    return this.repository.addNote(userId, applicationId, input.type, input.content);
  }

  async deleteNote(userId: string, applicationId: string, noteId: string): Promise<boolean> {
    const success = await this.repository.deleteNote(userId, applicationId, noteId);
    if (!success) {
      throw new AppError('Note not found or access denied', 404, 'NOTE_NOT_FOUND');
    }
    return true;
  }

  async addTask(
    userId: string,
    applicationId: string,
    input: CreateTaskInput,
  ): Promise<ApplicationTaskDto> {
    const app = await this.repository.findById(userId, applicationId);
    if (!app) {
      throw new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    return this.repository.addTask(userId, applicationId, {
      title: input.title,
      description: input.description,
      type: input.type,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
    });
  }

  async updateTask(
    userId: string,
    applicationId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<ApplicationTaskDto> {
    try {
      return await this.repository.updateTask(userId, applicationId, taskId, {
        title: input.title,
        description: input.description,
        type: input.type,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
        status: input.status,
        completedAt: input.status === TaskStatus.COMPLETED ? new Date() : undefined,
      });
    } catch {
      throw new AppError('Task not found or access denied', 404, 'TASK_NOT_FOUND');
    }
  }

  async deleteTask(userId: string, applicationId: string, taskId: string): Promise<boolean> {
    const success = await this.repository.deleteTask(userId, applicationId, taskId);
    if (!success) {
      throw new AppError('Task not found or access denied', 404, 'TASK_NOT_FOUND');
    }
    return true;
  }
}
