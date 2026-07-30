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

export interface IApplicationManagementService {
  createApplication(userId: string, input: CreateApplicationInput): Promise<ApplicationDto>;
  getApplications(options: ApplicationListOptions): Promise<PaginatedApplicationResult<ApplicationDto>>;
  getApplicationById(userId: string, applicationId: string): Promise<ApplicationDetailDto | null>;
  updateApplication(userId: string, applicationId: string, input: UpdateApplicationInput): Promise<ApplicationDto>;
  transitionStatus(userId: string, applicationId: string, input: StatusTransitionInput): Promise<ApplicationDto>;
  archiveApplication(userId: string, applicationId: string): Promise<ApplicationDto>;
  unarchiveApplication(userId: string, applicationId: string): Promise<ApplicationDto>;
  deleteApplication(userId: string, applicationId: string): Promise<boolean>;

  // Child resource management
  addNote(userId: string, applicationId: string, input: CreateNoteInput): Promise<ApplicationNoteDto>;
  deleteNote(userId: string, applicationId: string, noteId: string): Promise<boolean>;
  addTask(userId: string, applicationId: string, input: CreateTaskInput): Promise<ApplicationTaskDto>;
  updateTask(userId: string, applicationId: string, taskId: string, input: UpdateTaskInput): Promise<ApplicationTaskDto>;
  deleteTask(userId: string, applicationId: string, taskId: string): Promise<boolean>;
}
