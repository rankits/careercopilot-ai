import { ApplicationPlanResult } from '@/modules/auto-apply/types/planner.types.js';

export interface IApplicationPlannerService {
  createPlan(userId: string, jobId: string): Promise<ApplicationPlanResult>;
  getPlan(userId: string, jobId: string): Promise<ApplicationPlanResult | null>;
}
