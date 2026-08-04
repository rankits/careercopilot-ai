import {
  IJobDescriptionLookup,
  IVacancyEmailDiscoveryService,
  VacancyEmailDiscoveryResult,
} from '@/modules/auto-apply/contracts/vacancy-email.contract.js';
import { extractVacancyEmailCandidates } from '@/modules/auto-apply/utils/vacancy-email.util.js';

/**
 * AJA-EMAIL-002. This is discovery-only groundwork — finding a candidate
 * recipient does not by itself enable the EMAIL channel. `ChannelDetectionService`
 * still returns EXTERNAL_MANUAL/UNSUPPORTED only, because discovering an
 * address is not the same as being authorized to send from the user's own
 * mailbox (AJA-EMAIL-001, Gmail OAuth) — that capability doesn't exist yet.
 */
export class VacancyEmailDiscoveryService implements IVacancyEmailDiscoveryService {
  constructor(private readonly jobDescriptionLookup: IJobDescriptionLookup) {}

  async discoverForJob(jobId: string): Promise<VacancyEmailDiscoveryResult> {
    const descriptionText = await this.jobDescriptionLookup.findDescriptionText(jobId);
    if (!descriptionText) {
      return { candidates: [], bestCandidate: null };
    }

    const candidates = extractVacancyEmailCandidates(descriptionText);
    return { candidates, bestCandidate: candidates[0] ?? null };
  }
}
