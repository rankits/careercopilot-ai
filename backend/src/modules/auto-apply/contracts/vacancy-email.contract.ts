import { VacancyEmailCandidate } from '@/modules/auto-apply/utils/vacancy-email.util.js';

export interface IJobDescriptionLookup {
  findDescriptionText(jobId: string): Promise<string | null>;
}

export interface VacancyEmailDiscoveryResult {
  candidates: VacancyEmailCandidate[];
  bestCandidate: VacancyEmailCandidate | null;
}

export interface IVacancyEmailDiscoveryService {
  discoverForJob(jobId: string): Promise<VacancyEmailDiscoveryResult>;
}
