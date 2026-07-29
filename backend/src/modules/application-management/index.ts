import applicationRoutes from '@/modules/application-management/routes/application.route.js';
import { applicationService } from '@/modules/application-management/controllers/application.controller.js';
import { PrismaApplicationRepository } from '@/modules/application-management/repositories/prisma-application.repository.js';
export * from '@/modules/application-management/types/application.types.js';
export * from '@/modules/application-management/validations/application.validation.js';

export { applicationRoutes, applicationService, PrismaApplicationRepository };
