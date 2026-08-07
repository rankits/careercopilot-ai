import {
  IChannelDetectionJobLookup,
  IChannelDetectionService,
} from '@/modules/auto-apply/contracts/channel-detection.contract.js';
import { ChannelDetectionResult } from '@/modules/auto-apply/types/channel-detection.types.js';

/**
 * Implements AJA-BE-001. Classifies a job into
 * `ATS_API | EMAIL | BROWSER_ASSISTED | EXTERNAL_MANUAL | UNSUPPORTED`
 * WITHOUT ever inferring ATS submission authorization from a provider/URL
 * pattern match — Greenhouse/Lever/Ashby (`modules/jobs/providers/*`) are
 * ingestion-only sources today, not submission-authorized ones
 * (AJA-PROD-002 / AJA-ATS-001).
 *
 * `ATS_API`, `EMAIL`, and `BROWSER_ASSISTED` are intentionally unreachable
 * from this service until their backing capability actually exists:
 *  - `ATS_API` needs a partner-authorization allowlist (Wave 6, AJA-ATS-001) — none exists yet.
 *  - `EMAIL` needs vacancy-email discovery (Wave 4, AJA-EMAIL-002) — none exists yet.
 *  - `BROWSER_ASSISTED` needs a signed extension package contract (Wave 5, AJA-EXT-001) — none exists yet.
 * Returning any of those now would be exactly the "false capability
 * signal" the Wave 1 cleanup (AJA-ARCH-003) exists to prevent — so this
 * service can currently only ever return `EXTERNAL_MANUAL` or `UNSUPPORTED`.
 * Each later wave should extend this service's real detection logic
 * instead of loosening this constraint from outside it.
 */
export class ChannelDetectionService implements IChannelDetectionService {
  constructor(private readonly jobLookup: IChannelDetectionJobLookup) {}

  async detectChannel(jobId: string): Promise<ChannelDetectionResult> {
    const job = await this.jobLookup.findJobChannelSnapshot(jobId);
    if (!job) {
      return { channel: 'UNSUPPORTED', reason: 'Job not found' };
    }

    if (job.status !== 'ACTIVE') {
      return { channel: 'UNSUPPORTED', reason: `Job status is ${job.status}, not ACTIVE` };
    }

    if (job.applyUrl) {
      return {
        channel: 'EXTERNAL_MANUAL',
        reason:
          'Job has a validated external apply URL; no authorized automated channel is available yet',
      };
    }

    return {
      channel: 'UNSUPPORTED',
      reason: 'No supported application channel could be determined for this job',
    };
  }
}
