import { EligibilityResult } from '@/modules/auto-apply/types/eligibility.types.js';

export interface JobEligibilitySnapshot {
  id: string;
  title: string;
  companySlug: string;
  remoteType: string | null;
  salaryMax: number | null;
  status: string;
  sourceProviders: string[];
  /** Reuses `Job.canonicalHash` (jobs.prisma) — the ingestion pipeline's own
   * cross-source dedup hash — as the canonical job id (AJA-DATA-003). */
  canonicalJobId: string;
}

/** Read-only lookup into the jobs domain — never writes, never imports
 * jobs-module internals, mirrors the resume-ownership lookup convention. */
export interface IJobEligibilityLookup {
  findJobSnapshot(jobId: string): Promise<JobEligibilitySnapshot | null>;
}

export interface IEligibilityService {
  evaluateForJob(userId: string, jobId: string): Promise<EligibilityResult>;
}
