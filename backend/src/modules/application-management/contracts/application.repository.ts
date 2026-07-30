import {
  Prisma,
  ApplicationStatus,
  StatusChangedBy,
  NoteType,
  TaskType,
  TaskStatus,
} from '@prisma/client';
import {
  ApplicationDto,
  ApplicationDetailDto,
  ApplicationListOptions,
  PaginatedApplicationResult,
  ApplicationStatusHistoryDto,
  ApplicationNoteDto,
  ApplicationTaskDto,
} from '@/modules/application-management/types/application.types.js';

export interface IApplicationRepository {
  create(
    data: Prisma.ApplicationUncheckedCreateInput,
    source?: Prisma.ApplicationSourceUncheckedCreateWithoutApplicationInput,
    initialHistoryNote?: string
  ): Promise<ApplicationDto>;

  findById(userId: string, applicationId: string): Promise<ApplicationDetailDto | null>;
  findByJobId(userId: string, jobId: string): Promise<ApplicationDto | null>;
  findByNormalisedUrl(userId: string, normalisedJobUrl: string): Promise<ApplicationDto | null>;

  list(options: ApplicationListOptions): Promise<PaginatedApplicationResult<ApplicationDto>>;

  update(
    userId: string,
    applicationId: string,
    data: Prisma.ApplicationUncheckedUpdateInput
  ): Promise<ApplicationDto>;

  delete(userId: string, applicationId: string): Promise<boolean>;

  // Status history
  addStatusHistory(
    userId: string,
    applicationId: string,
    data: {
      fromStatus: ApplicationStatus | null;
      toStatus: ApplicationStatus;
      changedBy: StatusChangedBy;
      note?: string;
    }
  ): Promise<ApplicationStatusHistoryDto>;

  // Notes
  addNote(userId: string, applicationId: string, type: NoteType, content: string): Promise<ApplicationNoteDto>;
  deleteNote(userId: string, applicationId: string, noteId: string): Promise<boolean>;

  // Tasks
  addTask(
    userId: string,
    applicationId: string,
    data: {
      title: string;
      description?: string;
      type: TaskType;
      dueAt?: Date;
    }
  ): Promise<ApplicationTaskDto>;

  updateTask(
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
    }>
  ): Promise<ApplicationTaskDto>;

  deleteTask(userId: string, applicationId: string, taskId: string): Promise<boolean>;
}
