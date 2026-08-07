import { AutoApplyChannelValue } from '@/modules/auto-apply/types/job-application.types.js';
import {
  IJobApplicationAdapterRegistry,
  JobApplicationAdapter,
} from '@/modules/auto-apply/contracts/adapter.contract.js';

/**
 * Implements AJA-BE-002. Only channels with a genuinely working
 * implementation get registered here — `EMAIL`, `ATS_API`, and
 * `BROWSER_ASSISTED` are intentionally left unregistered until their
 * respective waves (email OAuth, partner ATS authorization, signed
 * extension packages) actually exist. A submission routed to an
 * unregistered channel fails loudly (`CHANNEL_UNSUPPORTED`,
 * `FAILED_DO_NOT_RETRY`) rather than silently doing nothing or
 * pretending to submit.
 */
export class JobApplicationAdapterRegistry implements IJobApplicationAdapterRegistry {
  private readonly adapters = new Map<AutoApplyChannelValue, JobApplicationAdapter>();

  register(adapter: JobApplicationAdapter): void {
    this.adapters.set(adapter.channel, adapter);
  }

  get(channel: AutoApplyChannelValue): JobApplicationAdapter | null {
    return this.adapters.get(channel) ?? null;
  }
}
